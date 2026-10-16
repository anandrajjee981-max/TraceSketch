import rateLimit from "express-rate-limit";

const createGroupLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 requests per windowMs
  message: "Too many groups created from this IP, please try again after a minute"
});


const messageRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 requests per windowMs
  message: "Too many messages sent from this IP, please try again after a minute"
});
const joinGroupLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per windowMs
  message: "Too many join requests from this IP, please try again after a minute"
});


export { messageRateLimiter , createGroupLimiter , joinGroupLimiter };