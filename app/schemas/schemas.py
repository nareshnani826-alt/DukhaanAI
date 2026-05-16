from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, Literal
from datetime import datetime
from uuid import UUID


# ── Auth ─────────────────────────────────────────────────────

class VendorRegister(BaseModel):
    email: EmailStr
    password: str
    store_name: str
    gstin: Optional[str] = None
    phone: Optional[str] = None

    @field_validator("password")
    @classmethod
    def strong_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class VendorLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    vendor_id: str
    store_name: str
    plan: str


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Vendor ───────────────────────────────────────────────────

class VendorProfile(BaseModel):
    id: UUID
    email: str
    store_name: str
    gstin: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    plan: str
    plan_expires_at: Optional[datetime]
    created_at: datetime


class VendorUpdate(BaseModel):
    store_name: Optional[str] = None
    gstin: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


# ── Product ──────────────────────────────────────────────────

class ProductCreate(BaseModel):
    name: str
    sku: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = "piece"
    stock: int = 0
    min_stock: int = 10
    mrp: float
    cost_price: float
    gst_percent: Literal[0, 5, 12, 18, 28] = 5


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    stock: Optional[int] = None
    min_stock: Optional[int] = None
    mrp: Optional[float] = None
    cost_price: Optional[float] = None
    gst_percent: Optional[Literal[0, 5, 12, 18, 28]] = None
    is_active: Optional[bool] = None


class ProductOut(BaseModel):
    id: UUID
    vendor_id: UUID
    name: str
    sku: Optional[str]
    category: Optional[str]
    stock: int
    min_stock: int
    mrp: float
    cost_price: float
    gst_percent: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    @property
    def is_low_stock(self) -> bool:
        return self.stock < self.min_stock

    @property
    def margin_percent(self) -> float:
        if self.mrp == 0:
            return 0
        return round((self.mrp - self.cost_price) / self.mrp * 100, 1)


# ── Sale ─────────────────────────────────────────────────────

class SaleCreate(BaseModel):
    product_id: UUID
    qty: int
    customer: str = "Walk-in"
    payment_mode: Literal["Cash", "UPI", "Credit", "Cheque"] = "Cash"

    @field_validator("qty")
    @classmethod
    def positive_qty(cls, v):
        if v <= 0:
            raise ValueError("Quantity must be greater than 0")
        return v


class SaleOut(BaseModel):
    id: UUID
    vendor_id: UUID
    product_id: UUID
    product_name: str
    qty: int
    unit_price: float
    total: float
    customer: str
    payment_mode: str
    sold_at: datetime


# ── Invoice ──────────────────────────────────────────────────

class InvoiceLineItem(BaseModel):
    product_id: Optional[str] = None
    name: str
    qty: int
    unit_price: float
    gst_percent: int


class InvoiceCreate(BaseModel):
    customer_name: str
    customer_gstin: Optional[str] = None
    payment_mode: Literal["Cash", "UPI", "Credit", "Cheque"] = "Cash"
    items: list[InvoiceLineItem]

    @field_validator("items")
    @classmethod
    def at_least_one(cls, v):
        if not v:
            raise ValueError("Invoice must have at least one item")
        return v


class InvoiceOut(BaseModel):
    id: UUID
    vendor_id: UUID
    invoice_no: str
    customer_name: str
    customer_gstin: Optional[str]
    payment_mode: str
    subtotal: float
    cgst: float
    sgst: float
    total: float
    items: list[dict]
    status: str
    pdf_url: Optional[str]
    created_at: datetime


# ── Subscription ─────────────────────────────────────────────

class SubscriptionCreate(BaseModel):
    plan: Literal["pro", "wholesale"]
    billing_cycle: Literal["monthly", "yearly"]


class SubscriptionOut(BaseModel):
    id: UUID
    vendor_id: UUID
    razorpay_sub_id: Optional[str]
    plan: str
    billing_cycle: str
    amount: float
    status: str
    current_start: Optional[datetime]
    current_end: Optional[datetime]
    created_at: datetime


class RazorpayWebhookEvent(BaseModel):
    event: str
    payload: dict


# ── Generic responses ────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str


class PaginatedResponse(BaseModel):
    data: list
    total: int
    page: int
    per_page: int
