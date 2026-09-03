import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { resolveTemplate } from "../lib/templates";
import AppShell from "../components/AppShell";
import Builder from "../components/Builder";
import {
  NumberedCard,
  YearCard,
  LabelsCard,
  SimpleCard,
  TierCard,
} from "../components/TemplateCard";

/**
 * Two steps: pick a shape, then fill it in.
 *
 * The template lives in the URL rather than in component state so the back
 * button returns to the chooser, and so a half-built list survives a reload
 * landing on the right shape.
 */
export default function NewList() {
  const [params] = useSearchParams();
  const id = params.get("template");

  if (!id) return <TemplateChooser />;

  const template = resolveTemplate(id, params);

  // Keyed on the resolved shape so switching rebuilds the form from scratch
  // rather than trying to reconcile a ten-row list into a four-row one.
  return <Create key={params.toString()} template={template} />;
}

function TemplateChooser() {
  return (
    <AppShell wide>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">New list</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold">Pick a shape</h1>
      <p className="mt-3 max-w-lg leading-relaxed text-muted">
        A starting point, not a rule. Add rows, remove them, or change your mind
        about the order once you are in.
      </p>

      <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <NumberedCard />
        <SimpleCard
          id="rushmore"
          name="Mount Rushmore"
          hint="Four faces, no order"
          marks={["•", "•", "•", "•"]}
        />
        <YearCard />
        <TierCard />
        <LabelsCard />
      </div>
    </AppShell>
  );
}

function Create({ template }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <AppShell>
      <Builder
        shape={template}
        eyebrow={template.name}
        heading="What are we ranking?"
        submitLabel="Publish list"
        action={
          <Link
            to="/new"
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-chalk"
          >
            Change shape
          </Link>
        }
        onSubmit={async (body) => {
          const created = await api("/api/lists", { method: "POST", body });
          navigate(`/u/${user.username}/${created.slug}`, { replace: true });
        }}
      />
    </AppShell>
  );
}
