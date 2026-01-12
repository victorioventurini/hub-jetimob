import type { Meta, StoryObj } from "@storybook/react";
import { StatusBadge, StatusDot, getStatusLabel } from "@/components/ui/status-badge";

const meta: Meta<typeof StatusBadge> = {
  title: "Data Display/StatusBadge",
  component: StatusBadge,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
StatusBadge é o componente canônico para exibir status em todo o Hub.
Usa um sistema centralizado de configuração por status string.

**Status disponíveis:**
- **RAG:** on_track, at_risk, off_track, not_started, no_data
- **OKR:** draft, active, completed, cancelled
- **Inventory:** available, loaned, maintenance, written_off
- **Keyring:** lost, retired
- **Ticket:** waiting, paused, in_progress, done, discarded
- **Initiative:** planned, blocked
- **Generic:** active, inactive, pending, error, success, warning

**Boas práticas:**
- Use as strings de status exatas conforme definidas
- Use \`customLabel\` para sobrescrever labels quando necessário
- Configure \`showDot={false}\` para ocultar o indicador
        `,
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    status: {
      control: "select",
      options: [
        "on_track", "at_risk", "off_track", "not_started", "no_data",
        "draft", "active", "completed", "cancelled",
        "available", "loaned", "maintenance", "written_off",
        "waiting", "paused", "in_progress", "done", "discarded",
        "planned", "blocked",
        "inactive", "pending", "error", "success", "warning",
      ],
      description: "Status string (define cores e label)",
    },
    showDot: {
      control: "boolean",
      description: "Exibir indicador de ponto colorido",
    },
    customLabel: {
      control: "text",
      description: "Label customizado (sobrescreve o padrão)",
    },
    size: {
      control: "select",
      options: ["sm", "md"],
      description: "Tamanho do badge",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ============= RAG Status =============

export const OnTrack: Story = {
  args: {
    status: "on_track",
  },
};

export const AtRisk: Story = {
  args: {
    status: "at_risk",
  },
};

export const OffTrack: Story = {
  args: {
    status: "off_track",
  },
};

export const NotStarted: Story = {
  args: {
    status: "not_started",
  },
};

export const NoData: Story = {
  args: {
    status: "no_data",
  },
};

// ============= OKR Status =============

export const Draft: Story = {
  args: {
    status: "draft",
  },
};

export const Active: Story = {
  args: {
    status: "active",
  },
};

export const Completed: Story = {
  args: {
    status: "completed",
  },
};

export const Cancelled: Story = {
  args: {
    status: "cancelled",
  },
};

// ============= Configurações =============

export const WithoutDot: Story = {
  args: {
    status: "success",
    showDot: false,
  },
};

export const WithCustomLabel: Story = {
  args: {
    status: "active",
    customLabel: "Em Produção",
  },
};

export const SmallSize: Story = {
  args: {
    status: "success",
    size: "sm",
  },
};

// ============= Showcase por Domínio =============

export const RagStatusAll: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge status="on_track" />
      <StatusBadge status="at_risk" />
      <StatusBadge status="off_track" />
      <StatusBadge status="not_started" />
      <StatusBadge status="no_data" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Status RAG para OKRs e KPIs (Red/Amber/Green).",
      },
    },
  },
};

export const OkrStatusAll: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge status="draft" />
      <StatusBadge status="active" />
      <StatusBadge status="completed" />
      <StatusBadge status="cancelled" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Status de ciclo de vida de objetivos OKR.",
      },
    },
  },
};

export const InventoryStatusAll: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge status="available" />
      <StatusBadge status="loaned" />
      <StatusBadge status="maintenance" />
      <StatusBadge status="written_off" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Status de ativos do inventário.",
      },
    },
  },
};

export const TicketStatusAll: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge status="waiting" />
      <StatusBadge status="paused" />
      <StatusBadge status="in_progress" />
      <StatusBadge status="done" />
      <StatusBadge status="discarded" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Status de tickets de atendimento.",
      },
    },
  },
};

export const InitiativeStatusAll: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge status="planned" />
      <StatusBadge status="in_progress" />
      <StatusBadge status="blocked" />
      <StatusBadge status="completed" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Status de iniciativas de OKRs.",
      },
    },
  },
};

export const GenericStatusAll: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge status="active" />
      <StatusBadge status="inactive" />
      <StatusBadge status="pending" />
      <StatusBadge status="success" />
      <StatusBadge status="warning" />
      <StatusBadge status="error" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Status genéricos para uso geral.",
      },
    },
  },
};

// ============= StatusDot Component =============

export const StatusDotComponent: Story = {
  render: () => (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground">StatusDot - Indicador isolado</h4>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <StatusDot status="success" size="xs" />
          <span className="text-sm">XS</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot status="success" size="sm" />
          <span className="text-sm">SM</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot status="success" size="md" />
          <span className="text-sm">MD</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot status="success" size="lg" />
          <span className="text-sm">LG</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <StatusDot status="on_track" />
        <StatusDot status="at_risk" />
        <StatusDot status="off_track" />
        <StatusDot status="active" />
        <StatusDot status="pending" />
        <StatusDot status="error" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "O StatusDot pode ser usado isoladamente quando apenas a cor é necessária.",
      },
    },
  },
};

// ============= Tamanhos Comparados =============

export const SizeComparison: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <StatusBadge status="success" size="sm" />
      <StatusBadge status="success" size="md" />
    </div>
  ),
};

// ============= Sem Dot =============

export const AllWithoutDot: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge status="on_track" showDot={false} />
      <StatusBadge status="at_risk" showDot={false} />
      <StatusBadge status="off_track" showDot={false} />
      <StatusBadge status="active" showDot={false} />
      <StatusBadge status="error" showDot={false} />
    </div>
  ),
};
