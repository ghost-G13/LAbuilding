const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.qq.com",
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER || "",
    pass: process.env.EMAIL_PASS || "",
  },
});

async function sendVerificationCode(email, code) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("[邮件] 未配置邮箱，验证码仅输出到控制台:", code);
    return { success: false, message: "邮箱未配置，请联系管理员", consoleCode: code };
  }

  try {
    const mailOptions = {
      from: `"城市低空三维系统" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "城市低空三维系统 - 注册验证码",
      html: `
        <div style="max-width: 400px; margin: 0 auto; padding: 20px; font-family: 'Microsoft YaHei', sans-serif;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; text-align: center;">
            <h1 style="color: white; margin: 0;">城市低空三维系统</h1>
          </div>
          <div style="padding: 20px;">
            <p style="color: #666; line-height: 1.6;">您好，</p>
            <p style="color: #666; line-height: 1.6;">您正在注册城市低空三维系统账号，验证码为：</p>
            <div style="text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 4px;">${code}</span>
            </div>
            <p style="color: #999; font-size: 14px; line-height: 1.6;">验证码有效期为5分钟，请尽快使用。</p>
            <p style="color: #999; font-size: 14px; line-height: 1.6;">如果不是您本人操作，请忽略此邮件。</p>
          </div>
          <div style="border-top: 1px solid #eee; padding-top: 15px; text-align: center; color: #999; font-size: 12px;">
            <p>城市低空三维白模可视化与分析系统</p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("[邮件] 发送成功:", info.messageId);
    return { success: true, message: "验证码已发送到邮箱" };
  } catch (error) {
    console.error("[邮件] 发送失败:", error);
    
    console.warn("[邮件] 邮箱发送失败，验证码输出到控制台:", code);
    console.warn("[邮件] QQ邮箱配置指南:");
    console.warn("  1. 登录QQ邮箱 -> 设置 -> 账户");
    console.warn("  2. 开启POP3/SMTP服务");
    console.warn("  3. 生成授权码（非QQ密码）");
    console.warn("  4. 将授权码填入.env的EMAIL_PASS字段");
    
    return { 
      success: false, 
      message: "邮件发送失败，验证码已输出到服务器控制台，请联系管理员获取", 
      error: error.message,
      consoleCode: code
    };
  }
}

function isEmailConfigured() {
  return !!process.env.EMAIL_USER && !!process.env.EMAIL_PASS;
}

module.exports = { sendVerificationCode, isEmailConfigured };