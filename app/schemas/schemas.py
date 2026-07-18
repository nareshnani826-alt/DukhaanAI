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
    modules: list[str] = ["kirana"]

    @field_validator("password")
    @classmethod
    def strong_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class VendorLogin(BaseModel):
    identifier: str  # email or phone number
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    vendor_id: str
    store_name: str
    plan: str
    modules: list[str] = ["kirana"]


class RefreshRequest(BaseModel):
    refresh_token: str


class SendOtpRequest(BaseModel):
    phone: str


class VerifyOtpRequest(BaseModel):
    phone: str
    otp: str


class RegisterOtpRequired(BaseModel):
    """Returned by POST /auth/register — email OTP sent, account not created yet."""
    status: Literal["otp_required"]
    email: str          # address where OTP was sent
    pending_token: str  # short-lived signed JWT carrying the registration data


class RegisterConfirm(BaseModel):
    """Second step: submit OTP to complete phone-verified registration."""
    pending_token: str
    otp: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


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
    modules: list[str] = ["kirana"]
    created_at: datetime


class VendorUpdate(BaseModel):
    store_name: Optional[str] = None
    gstin: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    modules: Optional[list[str]] = None


# ── Product ──────────────────────────────────────────────────

class ProductCreate(BaseModel):
    name: str
    sku: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = "piece"
    stock: float = 0
    min_stock: float = 10
    mrp: float
    cost_price: float
    gst_percent: Literal[0, 3, 5, 12, 18, 28] = 5

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Product name cannot be empty")
        if len(v) > 150:
            raise ValueError("Product name too long (max 150 characters)")
        return v

    @field_validator("mrp")
    @classmethod
    def mrp_non_negative(cls, v):
        if v < 0:
            raise ValueError("MRP cannot be negative")
        return v

    @field_validator("cost_price")
    @classmethod
    def cost_non_negative(cls, v):
        if v < 0:
            raise ValueError("Cost price cannot be negative")
        return v

    @field_validator("stock")
    @classmethod
    def stock_non_negative(cls, v):
        if v < 0:
            raise ValueError("Stock cannot be negative")
        return v

    @field_validator("min_stock")
    @classmethod
    def min_stock_non_negative(cls, v):
        if v < 0:
            raise ValueError("Minimum stock cannot be negative")
        return v


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    stock: Optional[float] = None
    min_stock: Optional[float] = None
    mrp: Optional[float] = None
    cost_price: Optional[float] = None
    gst_percent: Optional[Literal[0, 3, 5, 12, 18, 28]] = None
    is_active: Optional[bool] = None


class ProductOut(BaseModel):
    id: UUID
    vendor_id: UUID
    name: str
    sku: Optional[str]
    category: Optional[str]
    unit: Optional[str] = "piece"
    stock: float
    min_stock: float
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
    qty: float
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
    qty: float
    unit_price: float
    total: float
    customer: str
    payment_mode: str
    sold_at: datetime


# ── Invoice ──────────────────────────────────────────────────

class InvoiceLineItem(BaseModel):
    product_id: Optional[str] = None
    name: str
    qty: float
    unit_price: float
    gst_percent: float = 0

    @field_validator("qty")
    @classmethod
    def qty_positive(cls, v):
        if v <= 0:
            raise ValueError("Quantity must be greater than 0")
        return v

    @field_validator("unit_price")
    @classmethod
    def price_non_negative(cls, v):
        if v < 0:
            raise ValueError("Unit price cannot be negative")
        return v

    @field_validator("name")
    @classmethod
    def item_name_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Item name cannot be empty")
        return v.strip()


class InvoiceCreate(BaseModel):
    customer_name: str
    customer_phone: Optional[str] = None
    customer_gstin: Optional[str] = None
    payment_mode: Literal["Cash", "UPI", "Credit", "Cheque"] = "Cash"
    apply_gst: bool = False
    items: list[InvoiceLineItem]

    @field_validator("items")
    @classmethod
    def at_least_one(cls, v):
        if not v:
            raise ValueError("Invoice must have at least one item")
        return v


class SendInvoiceWhatsAppRequest(BaseModel):
    phone: str


class InvoiceOut(BaseModel):
    id: UUID
    vendor_id: UUID
    invoice_no: str
    customer_name: str
    customer_phone: Optional[str] = None
    customer_gstin: Optional[str] = None
    payment_mode: str
    subtotal: float
    cgst: float
    sgst: float
    total: float
    items: list[dict]
    status: str
    pdf_url: Optional[str] = None
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

class BulkImportItem(BaseModel):
    name: str
    category: Optional[str] = "Other"
    unit: Optional[str] = "pc"
    mrp: float = 0
    cost_price: float = 0
    stock: float = 0
    min_stock: float = 5
    gst_percent: Literal[0, 3, 5, 12, 18, 28] = 0

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Product name cannot be empty")
        return v[:150]

    @field_validator("mrp", "cost_price", "stock", "min_stock")
    @classmethod
    def non_negative(cls, v):
        return max(0.0, v)


class BulkImportRequest(BaseModel):
    items: list[BulkImportItem]


class BulkImportResponse(BaseModel):
    added: int
    updated: int
    failed: int
    total: int


class MessageResponse(BaseModel):
    message: str


class PaginatedResponse(BaseModel):
    data: list
    total: int
    page: int
    per_page: int
