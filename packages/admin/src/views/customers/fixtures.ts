import type { CustomerViewerContext, SelectOption } from "./types";
import { getActiveGroupOptions } from "../../shared/model/useGroupOptions";

export const CURRENT_VIEWER: CustomerViewerContext = {
  ownerName: "山田翔太",
  group: "東京一組",
};

export const GROUP_OPTIONS: SelectOption[] = getActiveGroupOptions();

export const OWNER_OPTIONS: SelectOption[] = [
  { value: "yamada-s", label: "山田翔太" },
  { value: "takahashi-k", label: "高橋健太" },
  { value: "suzuki-a", label: "鈴木あかり" },
];

export {
  SAMPLE_BMV_AGGREGATE_POST_APPROVAL,
  SAMPLE_BMV_AGGREGATE_SIGNED,
  SAMPLE_BMV_AGGREGATE_WITH_CASE,
} from "./fixtures-bmv-aggregate";
