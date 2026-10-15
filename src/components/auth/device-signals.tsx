"use client";

import { useEffect } from "react";
import { writeDeviceCookie } from "@/lib/device-signals";

/**
 * Renders nothing. Mounted by the auth layout so every way into a new account
 * (email form, Google button, invite link) carries the device cookie the
 * server checks before granting free AI credits.
 */
export function DeviceSignals() {
  useEffect(() => {
    void writeDeviceCookie();
  }, []);
  return null;
}
