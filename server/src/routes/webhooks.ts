import { Router } from "express";
import express from "express";
import { Webhook } from "svix";
import prisma from "../lib/prisma.js";

const router = Router();

// Clerk sends raw body, so we need raw parser for this route
router.post(
  "/clerk",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("CLERK_WEBHOOK_SECRET not set");
      res.status(500).json({ error: "Webhook secret not configured" });
      return;
    }

    const svixId = req.headers["svix-id"] as string;
    const svixTimestamp = req.headers["svix-timestamp"] as string;
    const svixSignature = req.headers["svix-signature"] as string;

    if (!svixId || !svixTimestamp || !svixSignature) {
      res.status(400).json({ error: "Missing svix headers" });
      return;
    }

    let event: any;
    try {
      const wh = new Webhook(webhookSecret);
      event = wh.verify(req.body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch (err) {
      console.error("Webhook verification failed:", err);
      res.status(400).json({ error: "Invalid webhook signature" });
      return;
    }

    try {
      switch (event.type) {
        case "user.created": {
          const { id, email_addresses, first_name, last_name, phone_numbers, image_url, public_metadata } = event.data;
          const email = email_addresses?.[0]?.email_address;
          const phone = phone_numbers?.[0]?.phone_number;
          const role = public_metadata?.role === "admin" ? "admin" : "investor";
          const orgId = public_metadata?.orgId as string | undefined;

          if (!email || !orgId) {
            console.warn("Skipping user.created — missing email or orgId in metadata");
            break;
          }

          await prisma.user.upsert({
            where: { clerkId: id },
            update: {
              email,
              firstName: first_name || "",
              lastName: last_name || "",
              phone: phone || null,
              avatarUrl: image_url || null,
            },
            create: {
              clerkId: id,
              orgId,
              email,
              role: role as any,
              firstName: first_name || "",
              lastName: last_name || "",
              phone: phone || null,
              avatarUrl: image_url || null,
            },
          });
          break;
        }

        case "user.updated": {
          const { id, email_addresses, first_name, last_name, phone_numbers, image_url } = event.data;
          const email = email_addresses?.[0]?.email_address;
          const phone = phone_numbers?.[0]?.phone_number;

          await prisma.user.updateMany({
            where: { clerkId: id },
            data: {
              ...(email && { email }),
              ...(first_name !== undefined && { firstName: first_name || "" }),
              ...(last_name !== undefined && { lastName: last_name || "" }),
              phone: phone || null,
              avatarUrl: image_url || null,
            },
          });
          break;
        }

        case "user.deleted": {
          const { id } = event.data;
          await prisma.user.updateMany({
            where: { clerkId: id },
            data: { deletedAt: new Date() },
          });
          break;
        }
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Webhook processing error:", err);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  }
);

export default router;
