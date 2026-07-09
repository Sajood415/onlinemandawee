import type { SupportedLocale } from "@/lib/localization/product-vendor";

export function getProductReviewsCopy(locale: SupportedLocale) {
  const en = locale === "en";
  const ps = locale === "ps";

  return {
    title: en ? "Customer reviews" : ps ? "د پیرودونکو بیاکتنې" : "نظرات مشتریان",
    writeReview: en ? "Write a review" : ps ? "بیاکتنه ولیکئ" : "ثبت نظر",
    loginPrompt: en
      ? "Log in to write a review"
      : ps
        ? "د بیاکتنې لیکلو لپاره ننوځئ"
        : "برای ثبت نظر وارد حساب خود شوید",
    yourRating: en ? "Your rating" : ps ? "ستاسو درجه‌بندي" : "امتیاز شما",
    yourReview: en ? "Your review" : ps ? "ستاسو بیاکتنه" : "نظر شما",
    placeholder: en
      ? "Share your experience with this product..."
      : ps
        ? "خپل تجربه د دې محصول په اړه شریک کړئ..."
        : "تجربه خود را درباره این محصول به اشتراک بگذارید...",
    submit: en ? "Submit review" : ps ? "بیاکتنه وسپارئ" : "ثبت نظر",
    submitting: en ? "Submitting..." : ps ? "لیږدېږي..." : "در حال ارسال...",
    cancel: en ? "Cancel" : ps ? "لغوه کول" : "لغو",
    loadMore: en ? "Load more reviews" : ps ? "نورې بیاکتنې وګورئ" : "مشاهده نظرات بیشتر",
    loading: en ? "Loading reviews..." : ps ? "بیاکتنې پورته کېږي..." : "در حال بارگذاری نظرات...",
    empty: en
      ? "No reviews yet. Be the first to review this product!"
      : ps
        ? "تر اوسه بیاکتنه نشته. لومړی کس شئ چې دا محصول بیاکتنه کړئ!"
        : "هنوز نظری ثبت نشده است. اولین نفری باشید که نظر می‌دهید!",
    ratingRequired: en
      ? "Please select a star rating"
      : ps
        ? "مهرباني وکړئ ستوري درجه وټاکئ"
        : "لطفاً یک امتیاز ستاره‌ای انتخاب کنید",
    commentTooShort: en
      ? "Please write at least 5 characters in your review."
      : ps
        ? "مهرباني وکړئ لږترلږه ۵ توري ولیکئ."
        : "لطفاً حداقل ۵ کاراکتر در نظر خود بنویسید.",
    sessionExpired: en
      ? "Your session expired. Please log in again to submit a review."
      : ps
        ? "ستاسو ناسته پای ته ورسېده. د بیاکتنې لپاره بیا ننوځئ."
        : "نشست شما منقضی شده است. برای ثبت نظر دوباره وارد شوید.",
    submitSuccess: en ? "Review submitted" : ps ? "بیاکتنه وسپارل شوه" : "نظر شما ثبت شد",
    submitFailed: en
      ? "Could not submit your review. Please try again."
      : ps
        ? "ستاسو بیاکتنه ونه سپارل شوه. بیا هڅه وکړئ."
        : "ثبت نظر ناموفق بود. دوباره تلاش کنید.",
    reviewsCount: en
      ? (count: number) => `${count} ${count === 1 ? "review" : "reviews"}`
      : ps
        ? (count: number) => `${count} بیاکتنې`
        : (count: number) => `${count} نظر`,
  };
}
