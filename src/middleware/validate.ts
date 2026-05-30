import { Request, Response, NextFunction } from "express";
import { ZodTypeAny, ZodError } from "zod";

/**
 * Middleware factory that validates req.body, req.params, and/or req.query
 * against the provided Zod schemas.
 *
 * Usage:
 *   router.post("/", validate({ body: mySchema }), controller)
 */
export const validate =
  (schemas: {
    body?: ZodTypeAny;
    params?: ZodTypeAny;
    query?: ZodTypeAny;
  }) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as Record<string, string>;
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        res.status(422).json({
          success: false,
          message: "Validation failed",
          errors,
        });
        return;
      }
      next(err);
    }
  };
