export type BillingAlertCopy = {
  title: string;
  body: string;
};

const billingAlertCopy: Record<string, BillingAlertCopy> = {
  en: {
    title: "Action needed for Brickvalue Pro",
    body: "Update your payment details to keep Pro access.",
  },
  es: {
    title: "Se requiere una acción para Brickvalue Pro",
    body: "Actualiza tus datos de pago para mantener el acceso Pro.",
  },
  fr: {
    title: "Action requise pour Brickvalue Pro",
    body: "Mettez à jour vos informations de paiement pour conserver l’accès Pro.",
  },
  de: {
    title: "Aktion für Brickvalue Pro erforderlich",
    body: "Aktualisiere deine Zahlungsdaten, um den Pro-Zugriff zu behalten.",
  },
  it: {
    title: "Azione richiesta per Brickvalue Pro",
    body: "Aggiorna i dati di pagamento per mantenere l’accesso Pro.",
  },
  "pt-BR": {
    title: "Ação necessária para o Brickvalue Pro",
    body: "Atualize seus dados de pagamento para manter o acesso Pro.",
  },
  nl: {
    title: "Actie vereist voor Brickvalue Pro",
    body: "Werk je betaalgegevens bij om Pro-toegang te behouden.",
  },
  ja: {
    title: "Brickvalue Proで対応が必要です",
    body: "Proへのアクセスを維持するには、お支払い情報を更新してください。",
  },
  ko: {
    title: "Brickvalue Pro에 조치가 필요합니다",
    body: "Pro 이용을 유지하려면 결제 정보를 업데이트하세요.",
  },
  "zh-Hans": {
    title: "Brickvalue Pro 需要处理",
    body: "请更新付款信息以继续使用 Pro。",
  },
  "zh-Hant": {
    title: "Brickvalue Pro 需要處理",
    body: "請更新付款資訊以繼續使用 Pro。",
  },
  ar: {
    title: "يلزم اتخاذ إجراء بشأن Brickvalue Pro",
    body: "حدّث تفاصيل الدفع للحفاظ على وصول Pro.",
  },
  hi: {
    title: "Brickvalue Pro के लिए कार्रवाई ज़रूरी है",
    body: "Pro का ऐक्सेस बनाए रखने के लिए भुगतान विवरण अपडेट करें।",
  },
};

export function billingAlertForLanguage(languageCode: string | null | undefined): BillingAlertCopy {
  return billingAlertCopy[languageCode ?? "en"] ?? billingAlertCopy.en;
}
