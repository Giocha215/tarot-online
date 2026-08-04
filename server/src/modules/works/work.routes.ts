import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody } from "../../middleware/validate.js";
import { placeOrderSchema } from "./work.schemas.js";
import * as workService from "./work.service.js";

export const ordersRouter = Router();

ordersRouter.use(authenticate);

// Encargar un trabajo (paga el precio fijo y envía los datos a la asesora).
ordersRouter.post("/", validateBody(placeOrderSchema), async (req, res, next) => {
  try {
    res.status(201).json(await workService.placeOrder(req.user!.sub, req.body));
  } catch (err) {
    next(err);
  }
});
