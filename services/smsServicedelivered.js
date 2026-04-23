const axios = require("axios");

exports.sendOTPdelivery = async (phone, otp) => {
    try {
        const response = await axios.get("https://www.fast2sms.com/dev/bulkV2", {
            params: {
                authorization: process.env.FAST2SMS_API_KEY,
                route: "q",
                message: `Avigo OTP:${otp}. Please share this OTP with Avigo Delivery Partner. It is for testing Purposes.`,
                numbers: phone,
            },
        });

        return response.data;

    } catch (error) {
        console.error("SMS Error:", error.response?.data || error.message);
        throw new Error("Failed to send SMS");
    }
};