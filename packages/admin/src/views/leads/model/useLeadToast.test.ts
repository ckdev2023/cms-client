import { describe, expect, it } from "vitest";
import { useLeadToast } from "./useLeadToast";
import { createToastController } from "../../../shared/model/useToast";

describe("useLeadToast", () => {
  function setup(duration?: number) {
    const controller = createToastController();
    const toast = useLeadToast({ duration, controller });
    return { toast, controller };
  }

  it("delegates show() to shared toast controller", () => {
    const { toast, controller } = setup();

    toast.show({ title: "Hello", description: "World" });

    expect(controller.items.value).toHaveLength(1);
    expect(controller.items.value[0].title).toBe("Hello");
    expect(controller.items.value[0].description).toBe("World");
    expect(controller.items.value[0].tone).toBe("success");
  });

  it("uses custom duration", () => {
    const { toast, controller } = setup(5000);

    toast.show({ title: "T", description: "D" });

    expect(controller.items.value[0].durationMs).toBe(5000);
  });

  it("dismisses previous toast when show is called again", () => {
    const removed: string[] = [];
    const controller = createToastController({
      scheduleRemoval: (id) => {
        removed.push(id);
      },
    });
    const toast = useLeadToast({ controller });

    toast.show({ title: "First", description: "1" });
    const firstId = controller.items.value[0]?.id;

    toast.show({ title: "Second", description: "2" });

    const remaining = controller.items.value.filter((i) => i.id === firstId);
    expect(remaining).toHaveLength(0);
    expect(controller.items.value).toHaveLength(1);
    expect(controller.items.value[0].title).toBe("Second");
  });

  it("hide() dismisses the current toast", () => {
    const controller = createToastController({
      scheduleRemoval: () => {},
    });
    const toast = useLeadToast({ controller });

    toast.show({ title: "X", description: "Y" });
    expect(controller.items.value).toHaveLength(1);

    toast.hide();
    expect(controller.items.value).toHaveLength(0);
  });

  it("hide() is a no-op when nothing is shown", () => {
    const { toast, controller } = setup();
    toast.hide();
    expect(controller.items.value).toHaveLength(0);
  });
});
