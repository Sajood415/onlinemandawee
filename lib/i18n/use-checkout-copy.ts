"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

export type CheckoutCopy = ReturnType<typeof useCheckoutCopy>;

export function useCheckoutCopy() {
  const t = useTranslations("Checkout");
  const tc = useTranslations("Common");

  return useMemo(
    () => ({
      title: t("title"),
      loading: t("loading"),
      stepLabels: [
        t("steps.shipping"),
        t("steps.delivery"),
        t("steps.payment"),
      ] as const,
      home: t("home"),
      cart: t("cart"),
      subtitle: t("subtitle"),
      complete: {
        finalizing: t("complete.finalizing"),
        missingContext: t("complete.missingContext"),
        stripeMissing: t("complete.stripeMissing"),
        retrieveFailed: t("complete.retrieveFailed"),
        stillProcessing: t("complete.stillProcessing"),
        notCompleted: t("complete.notCompleted"),
        paymentReceived: t("complete.paymentReceived"),
        trackOrder: t("complete.trackOrder"),
        viewOrders: t("complete.viewOrders"),
        finalizeFailed: t("complete.finalizeFailed"),
        errorTitle: t("complete.errorTitle"),
        returnCheckout: t("complete.returnCheckout"),
        successTitle: t("complete.successTitle"),
        successBody: t("complete.successBody"),
      },
      stepOf: (current: number, total: number, label: string) =>
        t("stepOf", { current, total, label }),
      stepHeading: (current: number, total: number) =>
        t("stepHeading", { current, total }),
      common: {
        back: tc("back"),
        tryAgain: t("common.tryAgain"),
        vendor: t("common.vendor"),
        default: t("common.default"),
        applying: t("common.applying"),
        apply: t("common.apply"),
        processing: t("common.processing"),
      },
      deliveryMethod: {
        title: t("deliveryMethod.title"),
        pickup: t("deliveryMethod.pickup"),
        express: t("deliveryMethod.express"),
        standard: t("deliveryMethod.standard"),
      },
      contact: {
        fullName: t("contact.fullName"),
        email: t("contact.email"),
        phone: t("contact.phone"),
        fullNamePlaceholder: t("contact.fullNamePlaceholder"),
        emailPlaceholder: t("contact.emailPlaceholder"),
        phonePlaceholder: t("contact.phonePlaceholder"),
      },
      address: {
        street: t("address.street"),
        city: t("address.city"),
        postalCode: t("address.postalCode"),
        country: t("address.country"),
        streetPlaceholder: t("address.streetPlaceholder"),
        cityPlaceholder: t("address.cityPlaceholder"),
        postalPlaceholder: t("address.postalPlaceholder"),
        countryPlaceholder: t("address.countryPlaceholder"),
        selectCountry: t("address.selectCountry"),
        searchCountries: t("address.searchCountries"),
        noCountries: t("address.noCountries"),
        selectCity: t("address.selectCity"),
        selectCountryFirst: t("address.selectCountryFirst"),
        searchCities: t("address.searchCities"),
        noCities: t("address.noCities"),
        chooseCountryFirst: t("address.chooseCountryFirst"),
        selectPostal: t("address.selectPostal"),
        selectCityFirst: t("address.selectCityFirst"),
        searchPostal: t("address.searchPostal"),
        noPostal: t("address.noPostal"),
        chooseCityFirst: t("address.chooseCityFirst"),
      },
      shipping: {
        savedAddresses: t("shipping.savedAddresses"),
        contactDetails: t("shipping.contactDetails"),
        shippingAddress: t("shipping.shippingAddress"),
        pickupNotice: t("shipping.pickupNotice"),
        continueToDelivery: t("shipping.continueToDelivery"),
        fixFields: t("shipping.fixFields"),
      },
      delivery: {
        howCalculated: t("delivery.howCalculated"),
        pickupFee: t("delivery.pickupFee"),
        expressFee: t("delivery.expressFee"),
        standardFee: t("delivery.standardFee"),
        platformRate: (base: string, perKm: string) =>
          t("delivery.platformRate", { base, perKm }),
        drivingDistance: (distance: string) =>
          t("delivery.drivingDistance", { distance }),
        methodBasedFee: t("delivery.methodBasedFee"),
        basePlusKm: (base: string, perKm: string) =>
          t("delivery.basePlusKm", { base, perKm }),
        totalDelivery: t("delivery.totalDelivery"),
        continueToPayment: t("delivery.continueToPayment"),
      },
      payment: {
        cardRequired: t("payment.cardRequired"),
        card: t("payment.card"),
        cardSub: (currencyLabel: string) => t("payment.cardSub", { currencyLabel }),
        cardUnavailable: t("payment.cardUnavailable"),
        applyCouponFirst: t("payment.applyCouponFirst"),
        pay: (amount: string) => t("payment.pay", { amount }),
        securedByStripe: t("payment.securedByStripe"),
      },
      coupon: {
        discountFor: (storeName: string) => t("coupon.discountFor", { storeName }),
        placeholder: t("coupon.placeholder"),
        alreadyApplied: t("coupon.alreadyApplied"),
        applyFailed: t("coupon.applyFailed"),
        appliesToStore: (storeName: string) => t("coupon.appliesToStore", { storeName }),
        removeCoupon: (code: string) => t("coupon.removeCoupon", { code }),
      },
      summary: {
        title: t("summary.title"),
        emptyCart: t("summary.emptyCart"),
        subtotal: t("summary.subtotal"),
        delivery: t("summary.delivery"),
        discount: t("summary.discount"),
        total: t("summary.total"),
        qty: t("summary.qty"),
        unavailable: t("summary.unavailable"),
        calculatingDistance: t("summary.calculatingDistance"),
        waitingForAddress: t("summary.waitingForAddress"),
        calculatedAtPayment: t("summary.calculatedAtPayment"),
        drivingDistance: (distance: string) =>
          t("summary.drivingDistance", { distance }),
        methodBasedFee: t("summary.methodBasedFee"),
        basePlusKm: (base: string, perKm: string) =>
          t("summary.basePlusKm", { base, perKm }),
      },
      success: {
        confirmation: t("success.confirmation"),
        title: t("success.title"),
        cardMessage: t("success.cardMessage"),
        emailSent: (email: string) => t("success.emailSent", { email }),
        orderNumber: t("success.orderNumber"),
        keepOrderNumber: t("success.keepOrderNumber"),
        trackOrder: t("success.trackOrder"),
        trackOrderHint: t("success.trackOrderHint"),
        createAccount: t("success.createAccount"),
        signIn: t("success.signIn"),
        continueShopping: t("success.continueShopping"),
      },
      errors: {
        requiredFields: t("errors.requiredFields"),
        invalidEmail: t("errors.invalidEmail"),
        placeOrderFailed: t("errors.placeOrderFailed"),
        paymentFailed: t("errors.paymentFailed"),
        orderNotRecorded: t("errors.orderNotRecorded"),
        pricingFailed: t("errors.pricingFailed"),
        generic: t("errors.generic"),
      },
      validation: {
        nameRequired: t("validation.nameRequired"),
        nameMinLength: t("validation.nameMinLength"),
        nameLettersOnly: t("validation.nameLettersOnly"),
        emailRequired: t("validation.emailRequired"),
        emailInvalid: t("validation.emailInvalid"),
        phoneRequired: t("validation.phoneRequired"),
        phoneDigitsOnly: t("validation.phoneDigitsOnly"),
        phoneMinLength: t("validation.phoneMinLength"),
        phoneMaxLength: t("validation.phoneMaxLength"),
        streetRequired: t("validation.streetRequired"),
        cityRequired: t("validation.cityRequired"),
        cityLettersOnly: t("validation.cityLettersOnly"),
        countryRequired: t("validation.countryRequired"),
        countryLettersOnly: t("validation.countryLettersOnly"),
        postalInvalid: t("validation.postalInvalid"),
      },
    }),
    [t, tc]
  );
}

export function createCheckoutValidators(copy: CheckoutCopy) {
  const validateGuestName = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return copy.validation.nameRequired;
    if (trimmed.length < 2) return copy.validation.nameMinLength;
    if (!/^[A-Za-z\s'-]+$/.test(trimmed)) return copy.validation.nameLettersOnly;
    return null;
  };

  const validateGuestEmail = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return copy.validation.emailRequired;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return copy.validation.emailInvalid;
    return null;
  };

  const validateGuestPhone = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return copy.validation.phoneRequired;
    if (!/^\d+$/.test(trimmed)) return copy.validation.phoneDigitsOnly;
    if (trimmed.length < 7) return copy.validation.phoneMinLength;
    if (trimmed.length > 15) return copy.validation.phoneMaxLength;
    return null;
  };

  const validateAddressLine = (value: string): string | null => {
    if (!value.trim()) return copy.validation.streetRequired;
    return null;
  };

  const validateCity = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return copy.validation.cityRequired;
    if (!/^[A-Za-z\s'-]+$/.test(trimmed)) return copy.validation.cityLettersOnly;
    return null;
  };

  const validateCountry = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return copy.validation.countryRequired;
    if (!/^[A-Za-z\s'-]+$/.test(trimmed)) return copy.validation.countryLettersOnly;
    return null;
  };

  const validatePostalCode = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!/^[A-Za-z0-9\s-]+$/.test(trimmed)) return copy.validation.postalInvalid;
    return null;
  };

  return {
    validateGuestName,
    validateGuestEmail,
    validateGuestPhone,
    validateAddressLine,
    validateCity,
    validateCountry,
    validatePostalCode,
    validateCheckoutShippingForm: (
      contact: { guestName: string; guestEmail: string; guestPhone: string },
      address: { addressLine1: string; city: string; country: string; postalCode: string },
      options?: { addressRequired?: boolean }
    ) => {
      const errors: Partial<
        Record<
          "guestName" | "guestEmail" | "guestPhone" | "addressLine1" | "city" | "country" | "postalCode",
          string
        >
      > = {};

      const nameError = validateGuestName(contact.guestName);
      if (nameError) errors.guestName = nameError;

      const emailError = validateGuestEmail(contact.guestEmail);
      if (emailError) errors.guestEmail = emailError;

      const phoneError = validateGuestPhone(contact.guestPhone);
      if (phoneError) errors.guestPhone = phoneError;

      if (options?.addressRequired ?? true) {
        const addressError = validateAddressLine(address.addressLine1);
        if (addressError) errors.addressLine1 = addressError;

        const cityError = validateCity(address.city);
        if (cityError) errors.city = cityError;

        const countryError = validateCountry(address.country);
        if (countryError) errors.country = countryError;
      }

      const postalError = validatePostalCode(address.postalCode);
      if (postalError) errors.postalCode = postalError;

      return errors;
    },
  };
}
