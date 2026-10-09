import { useLocalSearchParams, useRouter } from "expo-router";
import { AccountForm } from "../../src/components/AccountForm";
import { BackButton, Page } from "../../src/components/Ui";

export default function RecoveryScreen() {
  const { placeId } = useLocalSearchParams<{ placeId?: string }>();
  const router = useRouter();
  const reportId = placeId && /^[a-z0-9][a-z0-9_-]{0,199}$/.test(placeId) ? placeId : undefined;
  return <Page><BackButton/><AccountForm startRecovery reportPlaceId={reportId} onAuthenticated={() => reportId ? router.replace({ pathname: "/confirm/[placeId]", params: { placeId: reportId } }) : router.replace("/settings")}/></Page>;
}
