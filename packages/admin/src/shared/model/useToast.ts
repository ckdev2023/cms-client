import { ref, type Ref } from "vue";

/** Toast 的语义色调。 */
export type ToastTone = "success" | "info" | "warning" | "error";

/** 单条 Toast 消息的完整数据。 */
export interface ToastItem {
  /** 唯一标识 */
  id: string;
  /** 标题文案 */
  title: string;
  /** 可选描述文案 */
  description?: string;
  /** 语义色调 */
  tone: ToastTone;
  /** 自动消失毫秒数 */
  durationMs: number;
}

/** 调用方传入的新增 Toast 参数（id / tone / durationMs 可省略）。 */
export type AddToastInput = Omit<ToastItem, "id" | "tone" | "durationMs"> &
  Partial<Pick<ToastItem, "tone" | "durationMs">>;

/** Toast 控制器返回值。 */
export interface UseToastReturn {
  /** 当前 Toast 队列（只读） */
  items: Readonly<Ref<ToastItem[]>>;
  /**
   * 添加一条 Toast 并返回其 id。
   *
   * @param input - 新增 Toast 的参数
   * @returns 生成的唯一 id
   */
  add(input: AddToastInput): string;
  /**
   * 立即关闭指定 Toast。
   *
   * @param id - 要关闭的 Toast id
   */
  dismiss(id: string): void;
}

const DEFAULT_DURATION_MS = 4000;

let _nextId = 0;

function generateId(): string {
  _nextId += 1;
  return `toast-${_nextId}`;
}

/**
 * 创建独立的 Toast 控制器实例，管理消息队列与自动消失。
 *
 * @param deps - 可选依赖注入
 * @param deps.scheduleRemoval - 自定义延时移除回调（测试用）
 * @returns Toast 控制器
 */
export function createToastController(deps?: {
  /** 自定义延时移除回调 */
  scheduleRemoval?: (id: string, ms: number) => void;
}): UseToastReturn {
  const items = ref<ToastItem[]>([]);

  function dismiss(id: string): void {
    items.value = items.value.filter((t) => t.id !== id);
  }

  const scheduleRemoval =
    deps?.scheduleRemoval ??
    ((id: string, ms: number) => {
      setTimeout(() => dismiss(id), ms);
    });

  function add(input: AddToastInput): string {
    const id = generateId();
    const item: ToastItem = {
      id,
      title: input.title,
      description: input.description,
      tone: input.tone ?? "success",
      durationMs: input.durationMs ?? DEFAULT_DURATION_MS,
    };
    items.value = [...items.value, item];
    scheduleRemoval(id, item.durationMs);
    return id;
  }

  return { items, add, dismiss };
}

let _singleton: UseToastReturn | null = null;

/**
 * 初始化全局 Toast 单例，应在应用根组件中调用。
 *
 * @returns Toast 控制器单例
 */
export function initToast(): UseToastReturn {
  _singleton = createToastController();
  return _singleton;
}

/**
 * 获取全局 Toast 单例。需先调用 `initToast`。
 *
 * @returns Toast 控制器单例
 */
export function useToast(): UseToastReturn {
  if (!_singleton) {
    throw new Error(
      "useToast() called before initToast(). " +
        "Call initToast() in the app root first.",
    );
  }
  return _singleton;
}

/**
 * 重置全局 Toast 单例（仅供测试用）。
 */
export function resetToast(): void {
  _singleton = null;
  _nextId = 0;
}
