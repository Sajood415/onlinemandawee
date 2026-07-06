import type { SupportedLocale } from "@/lib/localization/product-vendor";

export function getHawalaCopy(locale: SupportedLocale) {
  const en = locale === "en";
  const ps = locale === "ps";

  return {
    home: en ? "Home" : ps ? "کور" : "خانه",
    title: en ? "Hawala Money Transfer" : ps ? "د حواله پیسو لېږد" : "انتقال پول حواله",
    subtitle: en
      ? "Send or receive money between Afghanistan and the world. Fill in sender and receiver details and we'll calculate the amount using today's exchange rate."
      : ps
        ? "د افغانستان او نړۍ ترمنځ پیسې واستوئ یا ترلاسه کړئ. د لیږونکي او ترلاسه کوونکي توضیحات ولیکئ، مقدار به د نننۍ نرخ پر بنسټ محاسبه شي."
        : "پول را بین افغانستان و جهان ارسال یا دریافت کنید. مشخصات فرستنده و گیرنده را وارد کنید تا مقدار بر اساس نرخ امروز محاسبه شود.",
    badge: en ? "Hawala transfer" : ps ? "د حواله لېږد" : "انتقال حواله",

    formBadge: en ? "New transfer request" : ps ? "نوی د لېږد غوښتنه" : "درخواست انتقال جدید",
    formTitle: en ? "Send money" : ps ? "پیسې واستوئ" : "ارسال پول",
    formSubtitle: en
      ? "Submit your transfer request below. Our team will review and approve it, then update the status as it moves forward."
      : ps
        ? "خپله د لېږد غوښتنه لاندې وسپارئ. زموږ ټیم به دا بریسي او تصویب کړي، بیا د حالت تازه معلومات درکړي."
        : "درخواست انتقال خود را در پایین ثبت کنید. تیم ما آن را بررسی و تأیید می‌کند و وضعیت را به‌روزرسانی می‌کند.",
    required: en ? "Required fields" : ps ? "اړین برخې" : "فیلدهای الزامی",

    senderSection: en ? "Sender details" : ps ? "د لیږونکي معلومات" : "مشخصات فرستنده",
    receiverSection: en ? "Receiver details" : ps ? "د ترلاسه کوونکي معلومات" : "مشخصات گیرنده",
    amountSection: en ? "Amount & currency" : ps ? "مقدار او پیسې" : "مقدار و ارز",
    noteSection: en ? "Additional note" : ps ? "زیاته یادونه" : "یادداشت اضافی",

    senderName: en ? "Sender full name" : ps ? "د لیږونکي بشپړ نوم" : "نام کامل فرستنده",
    senderPhone: en ? "Sender phone number" : ps ? "د لیږونکي د تلیفون شمېره" : "شماره تلفن فرستنده",
    senderEmail: en ? "Sender email (optional)" : ps ? "د لیږونکي بریښنالیک (اختیاري)" : "ایمیل فرستنده (اختیاری)",
    senderCountry: en ? "Sender country" : ps ? "د لیږونکي هېواد" : "کشور فرستنده",
    senderAddress: en ? "Sender address" : ps ? "د لیږونکي پته" : "آدرس فرستنده",
    senderBankName: en ? "Sender bank name" : ps ? "د لیږونکي بانک نوم" : "نام بانک فرستنده",
    senderAccountNumber: en ? "Sender account number" : ps ? "د لیږونکي حساب شمېره" : "شماره حساب فرستنده",

    receiverName: en ? "Receiver full name" : ps ? "د ترلاسه کوونکي بشپړ نوم" : "نام کامل گیرنده",
    receiverPhone: en ? "Receiver phone number" : ps ? "د ترلاسه کوونکي تلیفون شمېره" : "شماره تلفن گیرنده",
    receiverCountry: en ? "Receiver country" : ps ? "د ترلاسه کوونکي هېواد" : "کشور گیرنده",
    receiverAddress: en ? "Receiver address" : ps ? "د ترلاسه کوونکي پته" : "آدرس گیرنده",
    receiverBankName: en ? "Receiver bank name" : ps ? "د ترلاسه کوونکي بانک نوم" : "نام بانک گیرنده",
    receiverAccountNumber: en
      ? "Receiver account number"
      : ps
        ? "د ترلاسه کوونکي حساب شمېره"
        : "شماره حساب گیرنده",

    sendAmount: en ? "Amount to send" : ps ? "د لېږلو مقدار" : "مقدار ارسال",
    sendCurrency: en ? "Send currency" : ps ? "د لېږد پیسې" : "ارز ارسال",
    receiveCurrency: en ? "Receiver gets currency" : ps ? "ترلاسه کوونکی به دا پیسې اخلي" : "گیرنده این ارز را دریافت می‌کند",
    receiverGets: en ? "Receiver will get" : ps ? "ترلاسه کوونکی به ترلاسه کړي" : "گیرنده دریافت خواهد کرد",
    exchangeRateLabel: en ? "Exchange rate" : ps ? "د تبادلې نرخ" : "نرخ تبادله",
    rateLoading: en ? "Calculating..." : ps ? "محاسبه کیږي..." : "در حال محاسبه...",
    rateUnavailable: en
      ? "Exchange rate unavailable for this currency pair."
      : ps
        ? "د دې پیسو جوړه لپاره د تبادلې نرخ نشته."
        : "نرخ تبادله برای این جفت ارز موجود نیست.",

    note: en ? "Note (optional)" : ps ? "یادونه (اختیاري)" : "یادداشت (اختیاری)",
    notePlaceholder: en
      ? "Purpose of transfer or any special delivery instructions"
      : ps
        ? "د لېږد هدف یا ځانګړي تحویلي لارښوونې"
        : "هدف انتقال یا دستورات خاص تحویل",

    submit: en ? "Submit transfer request" : ps ? "د لېږد غوښتنه وسپارئ" : "ثبت درخواست انتقال",
    submitting: en ? "Submitting..." : ps ? "لیږدېږي..." : "در حال ارسال...",
    validationSummary: en
      ? "Please fix the highlighted fields."
      : ps
        ? "مهرباني وکړئ نښان شوي برخې سمې کړئ."
        : "لطفاً فیلدهای مشخص‌شده را اصلاح کنید.",
    submitFailed: en
      ? "Could not submit your transfer request. Please try again."
      : ps
        ? "ستاسو د لېږد غوښتنه ونه لیږل شوه. بیا هڅه وکړئ."
        : "ارسال درخواست انتقال ناموفق بود. دوباره تلاش کنید.",

    successTitle: en ? "Transfer request received!" : ps ? "د لېږد غوښتنه ترلاسه شوه!" : "درخواست انتقال دریافت شد!",
    successBody: en
      ? "We received your Hawala transfer request. Our team will review and approve it shortly."
      : ps
        ? "موږ ستاسو د حواله لېږد غوښتنه ترلاسه کړه. زموږ ټیم به ژر دا وګوري او تصویب کړي."
        : "درخواست انتقال حواله شما دریافت شد. تیم ما به‌زودی آن را بررسی و تأیید می‌کند.",
    transferNumber: en ? "Transfer number" : ps ? "د لېږد شمېره" : "شماره انتقال",
    submitAnother: en ? "Submit another transfer" : ps ? "بله لېږد وسپارئ" : "ثبت انتقال دیگر",
    trackInAccount: en
      ? "Track status in your account"
      : ps
        ? "په حساب کې حالت وڅارئ"
        : "پیگیری وضعیت در حساب شما",

    howItWorksTitle: en ? "How Hawala transfers work" : ps ? "د حواله لېږد څنګه کار کوي" : "انتقال حواله چگونه کار می‌کند",
    step1Title: en ? "1. Submit details" : ps ? "۱. توضیحات وسپارئ" : "۱. ثبت مشخصات",
    step1Body: en
      ? "Fill in sender and receiver info, bank details, and the amount you want to send."
      : ps
        ? "د لیږونکي او ترلاسه کوونکي معلومات، د بانک توضیحات، او د لېږلو مقدار ولیکئ."
        : "اطلاعات فرستنده و گیرنده، جزئیات بانکی و مقدار مورد نظر را وارد کنید.",
    step2Title: en ? "2. We review & approve" : ps ? "۲. موږ بریسو او تصویبوو" : "۲. بررسی و تأیید",
    step2Body: en
      ? "Our team verifies the request and approves it for processing."
      : ps
        ? "زموږ ټیم غوښتنه تایید کوي او د پروسس لپاره تصویب کوي."
        : "تیم ما درخواست را بررسی کرده و برای پردازش تأیید می‌کند.",
    step3Title: en ? "3. Track delivery" : ps ? "۳. تحویلي وڅارئ" : "۳. پیگیری تحویل",
    step3Body: en
      ? "Status updates from in progress to delivered and completed."
      : ps
        ? "له پروسس څخه تر ترلاسه کیدو او بشپړیدو پورې د حالت تازه معلومات."
        : "وضعیت از در حال پردازش تا تحویل و تکمیل به‌روزرسانی می‌شود.",
  };
}
