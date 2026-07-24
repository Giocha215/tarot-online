import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import {
  loginLimiter,
  refreshLimiter,
  registerLimiter,
} from "../../middleware/rate-limit.js";
import { validateBody } from "../../middleware/validate.js";
import * as controller from "./auth.controller.js";
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
} from "./auth.schemas.js";

export const authRouter = Router();

// --- públicas ---
authRouter.post(
  "/register",
  registerLimiter,
  validateBody(registerSchema),
  controller.register,
);

authRouter.post(
  "/login",
  loginLimiter,
  validateBody(loginSchema),
  controller.login,
);

authRouter.post("/refresh", refreshLimiter, controller.refresh);
authRouter.post("/logout", controller.logout);

// --- protegidas ---
authRouter.get("/me", authenticate, controller.me);
authRouter.post("/logout-all", authenticate, controller.logoutAll);
authRouter.post(
  "/change-password",
  authenticate,
  validateBody(changePasswordSchema),
  controller.changePassword,
);
