const axios = require("axios");

exports.sendOTP = async (phone, otp) => {
  try {
    const response = await axios.get("https://www.fast2sms.com/dev/bulkV2", {
      params: {
        authorization: process.env.FAST2SMS_API_KEY,
        route: "q",
        message: `Avigo OTP:${otp}. Valid for 5 minutes. Do not share this code. It is for testing Purposes.`,
        numbers: phone,
      },
    });

    return response.data;

  } catch (error) {
    console.error("SMS Error:", error.response?.data || error.message);
    throw new Error("Failed to send SMS");
  }
};