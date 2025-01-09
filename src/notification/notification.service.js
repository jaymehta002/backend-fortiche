import { Product } from "../product/product.model.js";
import { Notification } from "./notification.model.js";
import { User } from "../user/user.model.js";
export const createNotification = async ({ userId, title, message }) => {
  try {
    const notification = await Notification.create({
      userId,
      title,
      message,
    });
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};
export const createBrandCheckoutNotification = async (order, guest, brand) => {
  const productDetails = await Promise.all(
    order.orderItems.map(async (item) => {
      const product = await Product.findById(item.productId);
      if (!product) {
        throw new Error(`Product not found for id: ${item.productId}`);
      }
      return {
        ...product.toObject(),
        title: product.title,
        quantity: item.quantity,
        totalPrice: item.totalAmount,
        downloadableDetails: product.downloadableDetails,
        isDownloadable: product.productType === "downloadable",
      };
    }),
  );

  if (brand?._id) {
    const itemCount = productDetails.length;
    const isDownloadable = productDetails.every(
      (product) => product.isDownloadable,
    );
    const productType = isDownloadable ? "digital product" : "product";
    const productNames = productDetails.map((p) => p.title).join(", ");

    await createNotification({
      userId: brand._id,
      title: "New Order Received",
      message: `${guest.name} purchased ${itemCount} ${productType} (${productNames}) - Order #${order.orderNumber}`,
    });
  }
};

export const createInfluencerCheckoutNotification = async (
  order,
  brand,
  influencer,
  isDownloadable,
) => {
  const productDetails = await Promise.all(
    order.orderItems.map(async (item) => {
      const product = await Product.findById(item.productId);
      if (!product) {
        throw new Error(`Product not found for id: ${item.productId}`);
      }
      return {
        title: product.title,
        quantity: item.quantity,
      };
    }),
  );

  if (influencer?._id) {
    const productNames = productDetails
      .map((p) => `${p.quantity}x ${p.title}`)
      .join(", ");
    await createNotification({
      userId: influencer._id,
      title: "Order Confirmed",
      message: `Your order from ${brand.fullName} #${order.orderNumber} for ${productNames} has been confirmed`,
    });
  }

  if (brand?._id) {
    const itemCount = productDetails.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    const productType = isDownloadable ? "digital product" : "product";
    const productNames = productDetails.map((p) => p.title).join(", ");
    
    await createNotification({
      userId: brand._id,
      title: "New Order Received",
      message: `${influencer.fullName} purchased ${itemCount} ${productType} (${productNames}) - Order #${order.orderNumber}`,
    });
  }
};

export const createGuestCheckoutNotification = async (
  order,
  customerData,
  brandOrders,
  influencer,
) => {
  const brandNotifications = new Map(
    brandOrders.map(({ brandId, items }) => [brandId, items]),
  );

  
  for (const [brandId, items] of brandNotifications) {
    const brand = await User.findById(brandId);
    

    if (brand?._id) {
      await createNotification({
        userId: brand._id,
        title: "New Order Received",
        message: `${customerData.name} purchased ${items.length} product - Order #${order.orderNumber}`,
      });
    }
  }

  if (influencer?._id) {
    await createNotification({
      userId: influencer._id,
      title: "Commission Received",
      message: `You have received a commission for the order ${order.orderNumber}`,
    });
  }
};
