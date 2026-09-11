"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { formatCommissionRatePercent } from "@/lib/platform/transaction-fee";
import { toast } from "@/lib/utils/toast";

export type VendorFeeOverridesDto = {
  currency: string;
  defaultMembershipFeeAmount: number;
  defaultCommissionRateBps: number;
  membershipFeeAmountOverride: number | null;
  membershipFeeOverrideEndsAt: string | null;
  commissionRateBpsOverride: number | null;
  commissionRateOverrideEndsAt: string | null;
  effectiveMembershipFeeAmount: number;
  effectiveCommissionRateBps: number;
  membershipExempt: boolean;
};

type FeeMode = "default" | "custom" | "waive";

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localInputToIso(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function modeFromOverride(amount: number | null): FeeMode {
  if (amount == null) return "default";
  if (amount === 0) return "waive";
  return "custom";
}

type Props = {
  vendorId: string;
  disabled?: boolean;
  feeOverrides: VendorFeeOverridesDto;
  onSaved: (next: VendorFeeOverridesDto) => void;
};

export function AdminVendorFeeOverridesForm({
  vendorId,
  disabled = false,
  feeOverrides,
  onSaved,
}: Props) {
  const td = useTranslations("AdminPages.vendors.detail");
  const [membershipMode, setMembershipMode] = useState<FeeMode>(
    modeFromOverride(feeOverrides.membershipFeeAmountOverride)
  );
  const [membershipAmountDollars, setMembershipAmountDollars] = useState("");
  const [membershipEndsAt, setMembershipEndsAt] = useState("");
  const [commissionMode, setCommissionMode] = useState<FeeMode>(
    modeFromOverride(feeOverrides.commissionRateBpsOverride)
  );
  const [commissionPercent, setCommissionPercent] = useState("");
  const [commissionEndsAt, setCommissionEndsAt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMembershipMode(modeFromOverride(feeOverrides.membershipFeeAmountOverride));
    setMembershipAmountDollars(
      feeOverrides.membershipFeeAmountOverride != null &&
        feeOverrides.membershipFeeAmountOverride > 0
        ? (feeOverrides.membershipFeeAmountOverride / 100).toFixed(2)
        : (feeOverrides.defaultMembershipFeeAmount / 100).toFixed(2)
    );
    setMembershipEndsAt(toLocalInputValue(feeOverrides.membershipFeeOverrideEndsAt));
    setCommissionMode(modeFromOverride(feeOverrides.commissionRateBpsOverride));
    setCommissionPercent(
      feeOverrides.commissionRateBpsOverride != null &&
        feeOverrides.commissionRateBpsOverride > 0
        ? (feeOverrides.commissionRateBpsOverride / 100).toFixed(2)
        : (feeOverrides.defaultCommissionRateBps / 100).toFixed(2)
    );
    setCommissionEndsAt(toLocalInputValue(feeOverrides.commissionRateOverrideEndsAt));
  }, [feeOverrides]);

  const defaultMembershipLabel = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: feeOverrides.currency || "USD",
      }).format(feeOverrides.defaultMembershipFeeAmount / 100),
    [feeOverrides.currency, feeOverrides.defaultMembershipFeeAmount]
  );

  const defaultCommissionLabel = useMemo(
    () => formatCommissionRatePercent(feeOverrides.defaultCommissionRateBps),
    [feeOverrides.defaultCommissionRateBps]
  );

  const onSave = async () => {
    if (disabled) return;
    setSaving(true);
    try {
      let membershipFeeAmountOverride: number | null = null;
      if (membershipMode === "waive") membershipFeeAmountOverride = 0;
      if (membershipMode === "custom") {
        const dollars = Number.parseFloat(membershipAmountDollars);
        if (!Number.isFinite(dollars) || dollars < 0) {
          toast.error(td("feeOverrides.invalidMembershipAmount"));
          return;
        }
        membershipFeeAmountOverride = Math.round(dollars * 100);
      }

      let commissionRateBpsOverride: number | null = null;
      if (commissionMode === "waive") commissionRateBpsOverride = 0;
      if (commissionMode === "custom") {
        const percent = Number.parseFloat(commissionPercent);
        if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
          toast.error(td("feeOverrides.invalidCommissionPercent"));
          return;
        }
        commissionRateBpsOverride = Math.round(percent * 100);
      }

      const payload = {
        membershipFeeAmountOverride,
        membershipFeeOverrideEndsAt:
          membershipFeeAmountOverride == null
            ? null
            : localInputToIso(membershipEndsAt),
        commissionRateBpsOverride,
        commissionRateOverrideEndsAt:
          commissionRateBpsOverride == null
            ? null
            : localInputToIso(commissionEndsAt),
      };

      const res = await fetchWithAuth(`/api/admin/vendors/${vendorId}/fees`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await parseApiResponse<{
        feeOverrides: VendorFeeOverridesDto;
      }>(res);
      onSaved(data.feeOverrides);
      toast.success(td("toasts.feesSaved"));
    } catch (error) {
      toast.error(
        td("toasts.feesSaveFailed"),
        error instanceof Error ? error.message : undefined
      );
    } finally {
      setSaving(false);
    }
  };

  const selectClass =
    "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20";
  const inputClass = selectClass;

  return (
    <div className="mt-4 rounded-xl border border-neutral-200 p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-neutral-900">
          {td("feeOverrides.title")}
        </h3>
        <p className="mt-1 text-xs text-neutral-500">{td("feeOverrides.help")}</p>
        {disabled ? (
          <p className="mt-2 text-xs font-medium text-amber-700">
            {td("feeOverrides.platformDisabled")}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-neutral-100 bg-neutral-50/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {td("feeOverrides.membershipTitle")}
          </p>
          <p className="text-xs text-neutral-600">
            {td("feeOverrides.defaultLabel", { value: defaultMembershipLabel })}
          </p>
          <label className="block text-xs font-medium text-neutral-700">
            {td("feeOverrides.mode")}
            <select
              className={`mt-1 ${selectClass}`}
              disabled={disabled || saving}
              value={membershipMode}
              onChange={(e) => setMembershipMode(e.target.value as FeeMode)}
            >
              <option value="default">{td("feeOverrides.modeDefault")}</option>
              <option value="custom">{td("feeOverrides.modeCustom")}</option>
              <option value="waive">{td("feeOverrides.modeWaive")}</option>
            </select>
          </label>
          {membershipMode === "custom" ? (
            <label className="block text-xs font-medium text-neutral-700">
              {td("feeOverrides.membershipAmount")}
              <input
                type="number"
                min={0}
                step="0.01"
                className={`mt-1 ${inputClass}`}
                disabled={disabled || saving}
                value={membershipAmountDollars}
                onChange={(e) => setMembershipAmountDollars(e.target.value)}
              />
            </label>
          ) : null}
          {membershipMode !== "default" ? (
            <label className="block text-xs font-medium text-neutral-700">
              {td("feeOverrides.endsAt")}
              <input
                type="datetime-local"
                className={`mt-1 ${inputClass}`}
                disabled={disabled || saving}
                value={membershipEndsAt}
                onChange={(e) => setMembershipEndsAt(e.target.value)}
              />
              <span className="mt-1 block text-[11px] font-normal text-neutral-500">
                {td("feeOverrides.endsAtHint")}
              </span>
            </label>
          ) : null}
        </div>

        <div className="space-y-3 rounded-lg border border-neutral-100 bg-neutral-50/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {td("feeOverrides.commissionTitle")}
          </p>
          <p className="text-xs text-neutral-600">
            {td("feeOverrides.defaultLabel", { value: defaultCommissionLabel })}
          </p>
          <label className="block text-xs font-medium text-neutral-700">
            {td("feeOverrides.mode")}
            <select
              className={`mt-1 ${selectClass}`}
              disabled={disabled || saving}
              value={commissionMode}
              onChange={(e) => setCommissionMode(e.target.value as FeeMode)}
            >
              <option value="default">{td("feeOverrides.modeDefault")}</option>
              <option value="custom">{td("feeOverrides.modeCustom")}</option>
              <option value="waive">{td("feeOverrides.modeWaive")}</option>
            </select>
          </label>
          {commissionMode === "custom" ? (
            <label className="block text-xs font-medium text-neutral-700">
              {td("feeOverrides.commissionPercent")}
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                className={`mt-1 ${inputClass}`}
                disabled={disabled || saving}
                value={commissionPercent}
                onChange={(e) => setCommissionPercent(e.target.value)}
              />
            </label>
          ) : null}
          {commissionMode !== "default" ? (
            <label className="block text-xs font-medium text-neutral-700">
              {td("feeOverrides.endsAt")}
              <input
                type="datetime-local"
                className={`mt-1 ${inputClass}`}
                disabled={disabled || saving}
                value={commissionEndsAt}
                onChange={(e) => setCommissionEndsAt(e.target.value)}
              />
              <span className="mt-1 block text-[11px] font-normal text-neutral-500">
                {td("feeOverrides.endsAtHint")}
              </span>
            </label>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-neutral-600">
          {td("feeOverrides.effectiveNow", {
            membership: new Intl.NumberFormat(undefined, {
              style: "currency",
              currency: feeOverrides.currency || "USD",
            }).format(feeOverrides.effectiveMembershipFeeAmount / 100),
            commission: formatCommissionRatePercent(
              feeOverrides.effectiveCommissionRateBps
            ),
          })}
        </p>
        <button
          type="button"
          disabled={disabled || saving}
          onClick={() => void onSave()}
          className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a2540] disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? td("feeOverrides.saving") : td("feeOverrides.save")}
        </button>
      </div>
    </div>
  );
}
