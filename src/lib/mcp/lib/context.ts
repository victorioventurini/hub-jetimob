/**
 * Resolução de identidade e de unidade de negócio (BU) para as ferramentas MCP.
 *
 * O `bu_id` NUNCA vem do input livre: é sempre resolvido a partir das
 * associações reais do usuário autenticado.
 */
import { ToolError, type ToolContext } from "@lovable.dev/mcp-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseForUser } from "../supabase";
import { assertNoError } from "./result";

interface BuUnitRow {
  id: string;
  name: string;
  slug: string | null;
  status: string;
}

function firstUnit(value: BuUnitRow | BuUnitRow[] | null | undefined): BuUnitRow | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export interface HubBu {
  id: string;
  name: string;
  slug: string | null;
  role_in_bu: string | null;
  is_default: boolean;
}

export interface HubIdentity {
  supabase: SupabaseClient;
  profileId: string;
  displayName: string | null;
  userType: string | null;
  email: string | null;
  bus: HubBu[];
}

export interface HubScope extends HubIdentity {
  buId: string;
  buName: string;
}

export async function resolveIdentity(ctx: ToolContext): Promise<HubIdentity> {
  if (!ctx.isAuthenticated()) {
    throw new ToolError("Não autenticado. Conecte o Next no seu assistente e entre com sua conta.");
  }
  const supabase = supabaseForUser(ctx);
  const userId = ctx.getUserId();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, user_type, work_email, email")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  assertNoError(profileError, "seu perfil");
  if (!profile) {
    throw new ToolError("Não encontrei seu perfil no Next. Verifique se sua conta está ativa.");
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("bu_user_memberships")
    .select("bu_id, role_in_bu, is_default, bu_units!inner(id, name, slug, status)")
    .eq("profile_id", profile.id)
    .is("deleted_at", null);
  assertNoError(membershipError, "suas unidades");

  const bus: HubBu[] = (memberships ?? [])
    .map((m) => {
      const row = m as unknown as {
        bu_units: BuUnitRow | BuUnitRow[] | null;
        role_in_bu: string | null;
        is_default: boolean;
      };
      return { unit: firstUnit(row.bu_units), role: row.role_in_bu, isDefault: !!row.is_default };
    })
    .filter((row) => row.unit?.status === "active")
    .map((row) => ({
      id: row.unit.id,
      name: row.unit.name,
      slug: row.unit.slug,
      role_in_bu: row.role,
      is_default: row.isDefault,
    }));

  if (bus.length === 0) {
    // Usuários externos (contatos de parceiro) têm vínculo por associação.
    const { data: assoc } = await supabase
      .from("partner_contact_bu_associations")
      .select("bu_id, is_active, bu_units!inner(id, name, slug, status)")
      .eq("is_active", true);
    for (const row of assoc ?? []) {
      const unit = firstUnit((row as unknown as { bu_units: BuUnitRow | BuUnitRow[] | null }).bu_units);
      if (unit?.status === "active" && !bus.some((b) => b.id === unit.id)) {
        bus.push({ id: unit.id, name: unit.name, slug: unit.slug, role_in_bu: "external", is_default: false });
      }
    }
  }

  return {
    supabase,
    profileId: profile.id as string,
    displayName: (profile.display_name as string | null) ?? null,
    userType: (profile.user_type as string | null) ?? null,
    email: ((profile.work_email as string | null) ?? (profile.email as string | null)) ?? null,
    bus,
  };
}

/** Resolve a unidade a usar. `bu` aceita id, slug ou nome. */
export async function resolveScope(ctx: ToolContext, bu?: string | null): Promise<HubScope> {
  const identity = await resolveIdentity(ctx);
  if (identity.bus.length === 0) {
    throw new ToolError("Sua conta não está vinculada a nenhuma unidade ativa no Next.");
  }

  let chosen: HubBu | undefined;
  const needle = bu?.trim().toLowerCase();
  if (needle) {
    chosen = identity.bus.find(
      (b) =>
        b.id.toLowerCase() === needle ||
        (b.slug ?? "").toLowerCase() === needle ||
        b.name.toLowerCase() === needle ||
        b.name.toLowerCase().includes(needle),
    );
    if (!chosen) {
      throw new ToolError(
        `Não encontrei a unidade "${bu}" entre as suas: ${identity.bus.map((b) => b.name).join(", ")}.`,
      );
    }
  } else if (identity.bus.length === 1) {
    chosen = identity.bus[0];
  } else {
    chosen = identity.bus.find((b) => b.is_default);
    if (!chosen) {
      throw new ToolError(
        `Você tem acesso a várias unidades. Informe qual usar: ${identity.bus
          .map((b) => b.name)
          .join(", ")}.`,
      );
    }
  }

  return { ...identity, buId: chosen.id, buName: chosen.name };
}

/** Resolve uma pessoa da unidade por id, e-mail ou nome. */
export async function resolvePerson(
  scope: HubScope,
  person: string,
): Promise<{ id: string; display_name: string | null; team_id: string | null }> {
  const needle = person.trim();
  const { data, error } = await scope.supabase
    .from("profiles")
    .select("id, display_name, first_name, last_name, work_email, email, team_id")
    .eq("bu_id", scope.buId)
    .is("deleted_at", null)
    .or(
      [
        `id.eq.${/^[0-9a-f-]{36}$/i.test(needle) ? needle : "00000000-0000-0000-0000-000000000000"}`,
        `work_email.ilike.%${needle}%`,
        `email.ilike.%${needle}%`,
        `display_name.ilike.%${needle}%`,
        `first_name.ilike.%${needle}%`,
        `last_name.ilike.%${needle}%`,
      ].join(","),
    )
    .limit(10);
  assertNoError(error, "pessoas");

  const rows = data ?? [];
  if (rows.length === 0) throw new ToolError(`Não encontrei "${person}" na unidade ${scope.buName}.`);
  if (rows.length > 1) {
    const exact = rows.find(
      (r) =>
        (r.work_email as string | null)?.toLowerCase() === needle.toLowerCase() ||
        (r.email as string | null)?.toLowerCase() === needle.toLowerCase() ||
        (r.display_name as string | null)?.toLowerCase() === needle.toLowerCase(),
    );
    if (!exact) {
      throw new ToolError(
        `Encontrei mais de uma pessoa para "${person}": ${rows
          .map((r) => `${r.display_name} <${r.work_email ?? r.email ?? "sem e-mail"}>`)
          .join("; ")}. Refine a busca.`,
      );
    }
    return {
      id: exact.id as string,
      display_name: (exact.display_name as string | null) ?? null,
      team_id: (exact.team_id as string | null) ?? null,
    };
  }
  const only = rows[0];
  return {
    id: only.id as string,
    display_name: (only.display_name as string | null) ?? null,
    team_id: (only.team_id as string | null) ?? null,
  };
}
