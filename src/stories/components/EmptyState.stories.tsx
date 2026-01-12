import type { Meta, StoryObj } from "@storybook/react";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText, Users, Calendar, Bell } from "lucide-react";

const meta: Meta<typeof EmptyState> = {
  title: "Layout/EmptyState",
  component: EmptyState,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
O EmptyState é usado para comunicar ausência de dados de forma contextualizada.
Oferece variantes pré-configuradas para cenários comuns.

**Variantes disponíveis:**
- \`search\`: Busca sem resultados
- \`filter\`: Filtros muito restritivos
- \`firstUse\`: Primeiro uso com CTA
- \`noPermission\`: Sem acesso
- \`default\`: Genérico

**Boas práticas:**
- Sempre forneça uma ação quando possível
- Use a variante correta para o contexto
- Personalize title/description para mais clareza
        `,
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "search", "filter", "firstUse", "noPermission"],
      description: "Variante contextual",
    },
    compact: {
      control: "boolean",
      description: "Modo compacto para espaços menores",
    },
    title: {
      control: "text",
      description: "Título customizado (sobrescreve default da variante)",
    },
    description: {
      control: "text",
      description: "Descrição customizada",
    },
    actionLabel: {
      control: "text",
      description: "Label do botão de ação",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ============= Variantes =============

export const Default: Story = {
  args: {},
};

export const Search: Story = {
  args: {
    variant: "search",
  },
};

export const Filter: Story = {
  args: {
    variant: "filter",
  },
};

export const FirstUse: Story = {
  args: {
    variant: "firstUse",
    actionLabel: "Criar primeiro",
    onAction: () => alert("Criar!"),
  },
};

export const NoPermission: Story = {
  args: {
    variant: "noPermission",
  },
};

// ============= Customizado =============

export const CustomIcon: Story = {
  args: {
    icon: FileText,
    title: "Nenhum documento",
    description: "Você ainda não possui documentos cadastrados.",
    actionLabel: "Upload documento",
    onAction: () => {},
  },
};

export const UsersEmpty: Story = {
  args: {
    icon: Users,
    title: "Nenhum membro na equipe",
    description: "Adicione membros para começar a colaborar.",
    actionLabel: "Convidar membro",
    onAction: () => {},
  },
};

export const EventsEmpty: Story = {
  args: {
    icon: Calendar,
    title: "Nenhum evento agendado",
    description: "Não há eventos para as datas selecionadas.",
  },
};

export const NotificationsEmpty: Story = {
  args: {
    icon: Bell,
    title: "Tudo em dia!",
    description: "Você não tem notificações pendentes.",
  },
};

// ============= Compact =============

export const CompactDefault: Story = {
  args: {
    compact: true,
  },
};

export const CompactWithAction: Story = {
  args: {
    compact: true,
    variant: "firstUse",
    title: "Sem itens",
    description: "Crie seu primeiro item",
    actionLabel: "Criar",
    onAction: () => {},
  },
};

// ============= Showcase =============

export const AllVariants: Story = {
  render: () => (
    <div className="grid gap-8 max-w-2xl">
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">search</h3>
        <EmptyState variant="search" compact />
      </div>
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">filter</h3>
        <EmptyState variant="filter" compact />
      </div>
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">firstUse</h3>
        <EmptyState variant="firstUse" compact actionLabel="Começar" onAction={() => {}} />
      </div>
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">noPermission</h3>
        <EmptyState variant="noPermission" compact />
      </div>
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};
