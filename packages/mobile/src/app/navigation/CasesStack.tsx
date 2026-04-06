import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import { CaseListScreen } from "@features/case/ui/CaseListScreen";
import { CaseDetailScreen } from "@features/case/ui/CaseDetailScreen";

import type { CasesStackParamList } from "./types";

const Stack = createNativeStackNavigator<CasesStackParamList>();

/**
 * Cases 内嵌导航栈。
 *
 * @returns React 元素
 */
export function CasesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="CaseList" options={{ title: "案件" }}>
        {({ navigation }) => (
          <CaseListScreen
            onSelect={(caseId) => navigation.navigate("CaseDetail", { caseId })}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="CaseDetail" options={{ title: "案件詳細" }}>
        {({ route }) => <CaseDetailScreen caseId={route.params.caseId} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
