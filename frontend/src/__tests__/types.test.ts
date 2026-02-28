import { describe, it, expect } from "vitest";
import {
  computeDerivedFields,
  normalizeFunction,
  normalizeFirmware,
} from "../types";
import type { Device, ComputedDeviceFields } from "../types";
import devices from "./fixtures/devices.json";

type DeviceFixture = Partial<Device> & { expected: ComputedDeviceFields };

describe("computeDerivedFields", () => {
  it("computes hostname, mqttTopic, link and dns correctly for fixtures", () => {
    for (const d of devices as DeviceFixture[]) {
      // persisted fields must remain present
      expect(d.mac).toBeTruthy();
      expect(d.state).toBeTruthy();

      const result = computeDerivedFields(d);
      const exp = d.expected;
      expect(result.hostname).toEqual(exp.hostname);
      expect(result.mqttTopic).toEqual(exp.mqttTopic);
      expect(result.link).toEqual(exp.link);
      expect(result.dns).toEqual(exp.dns);
      expect(result.countTopic).toEqual(exp.countTopic);
      expect(result.enabled).toEqual(exp.enabled);
    }
  });
});

describe("normalizers", () => {
  it("normalizeFunction accepts known functions and slugifies others", () => {
    expect(normalizeFunction("Button")).toEqual("button");
    expect(normalizeFunction("DoorBell")).toEqual("doorbell");
    expect(normalizeFunction("Unknown Func")).toEqual("unknown-func");
  });

  it("normalizeFirmware normalizes known firmware names", () => {
    expect(normalizeFirmware("Tasmota")).toEqual("tasmota");
    expect(normalizeFirmware("Embedded")).toEqual("embeded");
    expect(normalizeFirmware("WLED")).toEqual("wled");
    expect(normalizeFirmware("Some FW")).toEqual("some-fw");
  });
});
