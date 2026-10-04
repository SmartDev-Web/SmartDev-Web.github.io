/* Centralized cart module: single source of truth for cart lines, promo code and totals, persisted in localStorage. */
const NordikCart = (() => {
  const CART_STORAGE_KEY = "nordik-cart-v1";
  const FREE_SHIPPING_THRESHOLD = 120;
  const MAXIMUM_LINE_QUANTITY = 10;
  const shippingMethods = {
    standard: { id: "standard", label: "Livraison standard", delay: "3 à 5 jours ouvrés", price: 6.9 },
    express: { id: "express", label: "Livraison express", delay: "24 h (commande avant 13 h)", price: 14.9 }
  };
  const promoCodes = {
    NORDIK10: { code: "NORDIK10", label: "10 % sur votre commande", type: "percent", value: 10, minimumSubtotal: 0 },
    HYGGE20: { code: "HYGGE20", label: "20 € offerts dès 150 € d'achat", type: "amount", value: 20, minimumSubtotal: 150 },
    LIVRAISONOFFERTE: { code: "LIVRAISONOFFERTE", label: "Livraison standard offerte", type: "shipping", value: 0, minimumSubtotal: 0 }
  };
  const changeListeners = new Set();
  function buildLineKey(productId, colorName, sizeLabel) {
    return [productId, colorName || "", sizeLabel || ""].join("|");
  }
  function getMaximumQuantity(product) {
    return Math.max(Math.min(MAXIMUM_LINE_QUANTITY, product.stock), 0);
  }
  function sanitizeStoredLine(storedLine) {
    if (!storedLine || typeof storedLine !== "object") return null;
    const product = NordikCatalog.getProductById(storedLine.productId);
    if (!product) return null;
    const colorIsKnown = product.colors.some((color) => color.name === storedLine.color);
    const sizeIsKnown = product.sizes.length ? product.sizes.some((size) => size.label === storedLine.size) : storedLine.size === "";
    const storedQuantity = Number(storedLine.quantity);
    if (!colorIsKnown || !sizeIsKnown || !Number.isInteger(storedQuantity) || storedQuantity < 1) return null;
    return { key: buildLineKey(product.id, storedLine.color, storedLine.size), productId: product.id, color: storedLine.color, size: storedLine.size, quantity: Math.min(storedQuantity, getMaximumQuantity(product)) };
  }
  function readCartState() {
    try {
      const storedState = JSON.parse(localStorage.getItem(CART_STORAGE_KEY));
      const storedLines = storedState && Array.isArray(storedState.lines) ? storedState.lines : [];
      const sanitizedLines = [];
      storedLines.map(sanitizeStoredLine).forEach((sanitizedLine) => {
        if (sanitizedLine && sanitizedLine.quantity > 0 && !sanitizedLines.some((line) => line.key === sanitizedLine.key)) sanitizedLines.push(sanitizedLine);
      });
      return {
        lines: sanitizedLines,
        promoCode: storedState && typeof storedState.promoCode === "string" && Object.prototype.hasOwnProperty.call(promoCodes, storedState.promoCode) ? storedState.promoCode : null
      };
    } catch (storageError) {
      return { lines: [], promoCode: null };
    }
  }
  let cartState = readCartState();
  function notifyListeners() {
    changeListeners.forEach((changeListener) => changeListener(cartState));
  }
  function persistCartState() {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartState));
    } catch (storageError) {
      console.warn("Nordik Store : panier non enregistré.", storageError);
    }
    notifyListeners();
  }
  window.addEventListener("storage", (storageEvent) => {
    if (storageEvent.key !== CART_STORAGE_KEY) return;
    cartState = readCartState();
    notifyListeners();
  });
  function getDetailedLines() {
    return cartState.lines.map((line) => {
      const product = NordikCatalog.getProductById(line.productId);
      const unitPrice = NordikCatalog.getUnitPrice(product, line.size);
      return { ...line, product, unitPrice, lineTotal: unitPrice * line.quantity };
    });
  }
  function getItemCount() {
    return cartState.lines.reduce((quantitySum, line) => quantitySum + line.quantity, 0);
  }
  function addItem({ productId, color, size, quantity = 1 }) {
    const product = NordikCatalog.getProductById(productId);
    if (!product) return null;
    const selectedColor = product.colors.some((productColor) => productColor.name === color) ? color : product.colors[0].name;
    const selectedSize = product.sizes.length ? (product.sizes.some((productSize) => productSize.label === size) ? size : product.sizes[0].label) : "";
    const requestedQuantity = Math.max(Math.round(Number(quantity)) || 1, 1);
    const maximumQuantity = getMaximumQuantity(product);
    const lineKey = buildLineKey(product.id, selectedColor, selectedSize);
    const existingLine = cartState.lines.find((line) => line.key === lineKey);
    if (existingLine) existingLine.quantity = Math.min(existingLine.quantity + requestedQuantity, maximumQuantity);
    else cartState.lines.push({ key: lineKey, productId: product.id, color: selectedColor, size: selectedSize, quantity: Math.min(requestedQuantity, maximumQuantity) });
    persistCartState();
    return lineKey;
  }
  function setQuantity(lineKey, requestedQuantity) {
    const targetLine = cartState.lines.find((line) => line.key === lineKey);
    if (!targetLine) return;
    const sanitizedQuantity = Math.round(Number(requestedQuantity)) || 0;
    if (sanitizedQuantity <= 0) cartState.lines = cartState.lines.filter((line) => line.key !== lineKey);
    else targetLine.quantity = Math.min(sanitizedQuantity, getMaximumQuantity(NordikCatalog.getProductById(targetLine.productId)));
    persistCartState();
  }
  function removeItem(lineKey) {
    cartState.lines = cartState.lines.filter((line) => line.key !== lineKey);
    persistCartState();
  }
  function clearCart() {
    cartState = { lines: [], promoCode: null };
    persistCartState();
  }
  function applyPromoCode(rawCode) {
    const normalizedCode = String(rawCode || "").trim().toUpperCase();
    if (!normalizedCode) return { success: false, message: "Saisissez un code promo." };
    const promoDefinition = Object.prototype.hasOwnProperty.call(promoCodes, normalizedCode) ? promoCodes[normalizedCode] : null;
    if (!promoDefinition) return { success: false, message: `Le code « ${normalizedCode.slice(0, 30)} » n'est pas valide.` };
    cartState.promoCode = normalizedCode;
    persistCartState();
    return { success: true, message: `Code ${normalizedCode} appliqué : ${promoDefinition.label}.` };
  }
  function removePromoCode() {
    cartState.promoCode = null;
    persistCartState();
  }
  function getActivePromo() {
    return cartState.promoCode ? promoCodes[cartState.promoCode] : null;
  }
  function getShippingMethod(shippingMethodId) {
    return Object.prototype.hasOwnProperty.call(shippingMethods, shippingMethodId) ? shippingMethods[shippingMethodId] : shippingMethods.standard;
  }
  function computeTotals(shippingMethodId = "standard") {
    const subtotal = getDetailedLines().reduce((amountSum, line) => amountSum + line.lineTotal, 0);
    const activePromo = getActivePromo();
    const promoIsEligible = Boolean(activePromo) && subtotal >= activePromo.minimumSubtotal;
    let discount = 0;
    if (promoIsEligible && activePromo.type === "percent") discount = Math.round(subtotal * activePromo.value) / 100;
    if (promoIsEligible && activePromo.type === "amount") discount = Math.min(activePromo.value, subtotal);
    const shippingMethod = getShippingMethod(shippingMethodId);
    const qualifiesForFreeStandard = subtotal >= FREE_SHIPPING_THRESHOLD || (promoIsEligible && activePromo.type === "shipping");
    let shipping = 0;
    if (subtotal > 0) shipping = shippingMethod.id === "standard" && qualifiesForFreeStandard ? 0 : shippingMethod.price;
    if (subtotal > 0 && shippingMethod.id === "express" && qualifiesForFreeStandard) shipping = shippingMethod.price - shippingMethods.standard.price;
    return {
      subtotal,
      discount,
      shipping,
      total: Math.max(subtotal - discount, 0) + shipping,
      activePromo,
      promoIsEligible,
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
      remainingForFreeShipping: Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0),
      freeShippingProgress: Math.min(subtotal / FREE_SHIPPING_THRESHOLD, 1)
    };
  }
  function subscribe(changeListener) {
    changeListeners.add(changeListener);
    return () => changeListeners.delete(changeListener);
  }
  return {
    FREE_SHIPPING_THRESHOLD,
    MAXIMUM_LINE_QUANTITY,
    shippingMethods,
    getShippingMethod,
    getMaximumQuantity,
    getDetailedLines,
    getItemCount,
    addItem,
    setQuantity,
    removeItem,
    clearCart,
    applyPromoCode,
    removePromoCode,
    getActivePromo,
    computeTotals,
    subscribe
  };
})();
