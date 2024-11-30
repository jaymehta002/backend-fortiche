import mongoose from "mongoose";

 
const OrderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  commission: {
    type: Number,
    required: true,
  },
  vatAmount: {
    type: Number,
    required: true,
  },
  shippingAmount: {
    type: Number,
    required: true,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
    default: "pending",
  },
});
 
const BrandOrderSummarySchema = new mongoose.Schema({
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  items: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "OrderItem"
  }],
  subtotal: Number,
  vatAmount: Number,
  shippingAmount: Number,
  totalAmount: Number,
  commission: Number,
  status: {
    type: String,
    enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
    default: "pending",
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded"],
    default: "pending",
  },
  paymentId: {
    type: String,
    required: true,
  },
 
});

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    influencerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "userModel",
    },
    userModel: {
      type: String,
      required: true,
      enum: ["User", "Guest"],
    },
    orderItems: [OrderItemSchema],
    brandOrders: [BrandOrderSummarySchema],
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentId: {
      type: String,
      required: true,
    },
    shippingAddress: {
      street: { type: String },
      apartment: String,
      city: { type: String, required: true },
      state: { type: String },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    customerInfo: {
      email: { type: String, required: true },
      name: { type: String, required: true },
      phone: String,
    },
    couponApplied: {
      couponId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Coupon"
      },
      discountAmount: Number,
    },
    notes: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// generate order number before saving
OrderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `ORD-${year}${month}-${(count + 1).toString().padStart(5, '0')}`;
  }
  next();
});

//calculate brand-specific totals
OrderSchema.methods.calculateBrandTotals = function() {
  const brandTotals = {};
  
  this.orderItems.forEach(item => {
    if (!brandTotals[item.brandId]) {
      brandTotals[item.brandId] = {
        items: [],
        subtotal: 0,
        vatAmount: 0,
        shippingAmount: 0,
        commission: 0,
        totalAmount: 0
      };
    }
    
    brandTotals[item.brandId].items.push(item._id);
    brandTotals[item.brandId].subtotal += item.unitPrice * item.quantity;
    brandTotals[item.brandId].vatAmount += item.vatAmount;
    brandTotals[item.brandId].shippingAmount += item.shippingAmount;
    brandTotals[item.brandId].commission += item.commission;
    brandTotals[item.brandId].totalAmount += item.totalAmount;
  });

  return brandTotals;
};

const Order = mongoose.model("Order", OrderSchema);
export default Order;