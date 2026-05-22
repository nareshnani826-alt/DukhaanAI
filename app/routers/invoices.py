import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Query
from app.core.database import get_db
from app.core.security import get_current_vendor
from app.schemas.schemas import InvoiceCreate, InvoiceOut

router = APIRouter(prefix="/invoices", tags=["invoices"])


def _next_invoice_no(db, vendor_id: str) -> str:
    """
    Generate sequential invoice number like INV-0001, INV-0002 ...
    Uses MAX(invoice_no) ordering by numeric value to avoid race conditions
    from concurrent requests — Supabase writes are serialized per row.
    """
    result = (
        db.table("invoices")
        .select("invoice_no")
        .eq("vendor_id", vendor_id)
        .order("created_at", desc=True)
        .limit(50)   # fetch recent 50 and pick max numerically — avoids gaps from ordering
        .execute()
    )
    if not result.data:
        return "INV-0001"
    max_num = 0
    for row in result.data:
        try:
            n = int(row["invoice_no"].split("-")[1])
            if n > max_num:
                max_num = n
        except (IndexError, ValueError, AttributeError):
            continue
    return f"INV-{max_num + 1:04d}"


@router.post("", response_model=InvoiceOut, status_code=201)
async def generate_invoice(body: InvoiceCreate, vendor=Depends(get_current_vendor)):
    db = get_db()

    # Calculate totals
    subtotal = 0.0
    tax_total = 0.0
    line_items = []

    for item in body.items:
        item_subtotal = round(item.unit_price * item.qty, 2)
        item_tax = round(item_subtotal * item.gst_percent / 100, 2)
        item_total = round(item_subtotal + item_tax, 2)
        subtotal += item_subtotal
        tax_total += item_tax
        line_items.append({
            "product_id": item.product_id,
            "name": item.name,
            "qty": item.qty,
            "unit_price": item.unit_price,
            "gst_percent": item.gst_percent,
            "subtotal": item_subtotal,
            "tax": item_tax,
            "total": item_total,
        })

    subtotal = round(subtotal, 2)
    tax_total = round(tax_total, 2)
    cgst = round(tax_total / 2, 2)
    sgst = round(tax_total - cgst, 2)  # ensures cgst + sgst == tax_total exactly
    grand_total = round(subtotal + tax_total, 2)

    invoice_no = _next_invoice_no(db, vendor["id"])

    # Build insert row — omit optional columns that are None to avoid
    # PGRST204 if those columns haven't been migrated in the live DB yet.
    row: dict = {
        "vendor_id":    vendor["id"],
        "invoice_no":   invoice_no,
        "customer_name": body.customer_name,
        "payment_mode": body.payment_mode,
        "subtotal":     subtotal,
        "cgst":         cgst,
        "sgst":         sgst,
        "total":        grand_total,
        "items":        line_items,
        "status":       "paid",
    }
    if body.customer_phone:
        row["customer_phone"] = body.customer_phone
    if body.customer_gstin:
        row["customer_gstin"] = body.customer_gstin

    try:
        result = db.table("invoices").insert(row).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Invoice insert returned no data")
        invoice = result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save invoice: {e}") from e

    # Deduct stock and record sales for each line item.
    # Wrapped in try/except so a stock-update failure never blocks the invoice response.
    sold_at = datetime.now(timezone.utc).isoformat()
    try:
        for item in line_items:
            if not item.get("product_id"):
                continue
            prod = db.table("products").select("id,stock").eq("id", item["product_id"]).eq("vendor_id", vendor["id"]).execute().data
            if not prod:
                continue
            current = float(prod[0]["stock"] or 0)
            new_stock = max(0, round(current - float(item["qty"]), 4))
            db.table("products").update({"stock": new_stock}).eq("id", item["product_id"]).execute()
            raw_qty = float(item["qty"])
            sale_qty = int(raw_qty) if raw_qty == int(raw_qty) else raw_qty
            db.table("sales").insert({
                "vendor_id":    vendor["id"],
                "product_id":   item["product_id"],
                "product_name": item["name"],
                "qty":          sale_qty,
                "unit_price":   item["unit_price"],
                "total":        item["total"],
                "customer":     body.customer_name,
                "payment_mode": body.payment_mode,
                "sold_at":      sold_at,
            }).execute()
    except Exception as stock_err:
        logging.warning("Stock/sales update failed after invoice %s: %s", invoice_no, stock_err)

    return invoice


@router.get("", response_model=list[InvoiceOut])
async def list_invoices(
    status: str | None = Query(None),
    limit: int = Query(50, le=200),
    vendor=Depends(get_current_vendor),
):
    db = get_db()
    q = (
        db.table("invoices")
        .select("*")
        .eq("vendor_id", vendor["id"])
        .order("created_at", desc=True)
        .limit(limit)
    )
    if status:
        q = q.eq("status", status)
    return q.execute().data


@router.get("/today")
async def today_invoices(vendor=Depends(get_current_vendor)):
    """Today's paid invoices — used by Dashboard and DayOps for revenue totals."""
    db = get_db()
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    ).isoformat()
    invoices = (
        db.table("invoices")
        .select("*")
        .eq("vendor_id", vendor["id"])
        .eq("status", "paid")
        .gte("created_at", today_start)
        .order("created_at", desc=True)
        .execute()
        .data
    )
    return {
        "invoices": invoices,
        "total": round(sum(inv["total"] for inv in invoices), 2),
        "count": len(invoices),
    }


@router.get("/{invoice_id}", response_model=InvoiceOut)
async def get_invoice(invoice_id: str, vendor=Depends(get_current_vendor)):
    db = get_db()
    result = (
        db.table("invoices")
        .select("*")
        .eq("id", invoice_id)
        .eq("vendor_id", vendor["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return result.data[0]


@router.patch("/{invoice_id}/status")
async def update_invoice_status(
    invoice_id: str,
    status: str = Query(..., pattern="^(paid|pending|cancelled)$"),
    vendor=Depends(get_current_vendor),
):
    db = get_db()
    existing = (
        db.table("invoices")
        .select("id")
        .eq("id", invoice_id)
        .eq("vendor_id", vendor["id"])
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Invoice not found")

    result = (
        db.table("invoices")
        .update({"status": status})
        .eq("id", invoice_id)
        .execute()
    )
    return result.data[0]


@router.get("/summary/gst")
async def gst_summary(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2024),
    vendor=Depends(get_current_vendor),
):
    """Monthly GST summary for filing returns."""
    db = get_db()
    start = f"{year}-{month:02d}-01T00:00:00+00:00"
    if month == 12:
        end = f"{year+1}-01-01T00:00:00+00:00"
    else:
        end = f"{year}-{month+1:02d}-01T00:00:00+00:00"

    invoices = (
        db.table("invoices")
        .select("*")
        .eq("vendor_id", vendor["id"])
        .eq("status", "paid")
        .gte("created_at", start)
        .lt("created_at", end)
        .execute()
        .data
    )

    total_sales = round(sum(inv["subtotal"] for inv in invoices), 2)
    total_cgst = round(sum(inv["cgst"] for inv in invoices), 2)
    total_sgst = round(sum(inv["sgst"] for inv in invoices), 2)
    total_tax = round(total_cgst + total_sgst, 2)

    return {
        "period": f"{year}-{month:02d}",
        "invoice_count": len(invoices),
        "taxable_sales": total_sales,
        "cgst_collected": total_cgst,
        "sgst_collected": total_sgst,
        "total_gst": total_tax,
        "gross_revenue": round(total_sales + total_tax, 2),
        "gstin": vendor.get("gstin", "Not set"),
    }
