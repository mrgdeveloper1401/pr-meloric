import rateLimit from "express-rate-limit";

export const emailOtpRateLimit = rateLimit(
    {
        windowMs: 10 * 60 * 1000,
        max: 3,
        message: {
            status: false,
            message: "تعداد درخواست ها بیش از حد مجاز هست لطفا هر ۱۰ دقیقه دیگر صبر کنید"
        }
    },
)