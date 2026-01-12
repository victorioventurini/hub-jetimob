import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, AlertTriangle, X, Star, Zap } from "lucide-react";

const meta: Meta<typeof Badge> = {
  title: "Componentes Base/Badge",
  component: Badge,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
Badges são usados para indicar status, categorias ou contadores.

**Variantes:**
- \`default\`: Uso geral
- \`secondary\`: Menor ênfase
- \`destructive\`: Estados de erro/alerta
- \`outline\`: Versão mais sutil

**Boas práticas:**
- Use badges de forma consistente para o mesmo tipo de informação
- Combine com ícones para maior clareza
- Evite textos longos em badges
        `,
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline"],
      description: "Variante visual",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ============= Variantes =============

export const Default: Story = {
  args: {
    children: "Badge",
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Secundário",
  },
};

export const Destructive: Story = {
  args: {
    variant: "destructive",
    children: "Erro",
  },
};

export const Outline: Story = {
  args: {
    variant: "outline",
    children: "Outline",
  },
};

// ============= Com Ícones =============

export const WithIconSuccess: Story = {
  args: {
    children: (
      <>
        <Check className="w-3 h-3" />
        Aprovado
      </>
    ),
    className: "bg-success text-success-foreground",
  },
};

export const WithIconPending: Story = {
  args: {
    variant: "secondary",
    children: (
      <>
        <Clock className="w-3 h-3" />
        Pendente
      </>
    ),
  },
};

export const WithIconWarning: Story = {
  args: {
    children: (
      <>
        <AlertTriangle className="w-3 h-3" />
        Atenção
      </>
    ),
    className: "bg-warning text-warning-foreground",
  },
};

export const WithIconError: Story = {
  args: {
    variant: "destructive",
    children: (
      <>
        <X className="w-3 h-3" />
        Rejeitado
      </>
    ),
  },
};

// ============= Status Badges =============

export const StatusActive: Story = {
  args: {
    children: "Ativo",
    className: "bg-success/10 text-success border-success/20",
  },
};

export const StatusInactive: Story = {
  args: {
    variant: "secondary",
    children: "Inativo",
  },
};

export const StatusDraft: Story = {
  args: {
    variant: "outline",
    children: "Rascunho",
  },
};

// ============= Showcase =============

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};

export const StatusBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge className="bg-success/10 text-success border-success/20">
        <Check className="w-3 h-3" />
        Concluído
      </Badge>
      <Badge className="bg-warning/10 text-warning border-warning/20">
        <Clock className="w-3 h-3" />
        Em andamento
      </Badge>
      <Badge className="bg-destructive/10 text-destructive border-destructive/20">
        <X className="w-3 h-3" />
        Cancelado
      </Badge>
      <Badge variant="secondary">
        <Star className="w-3 h-3" />
        Destacado
      </Badge>
      <Badge className="bg-accent/10 text-accent border-accent/20">
        <Zap className="w-3 h-3" />
        Novo
      </Badge>
    </div>
  ),
};

export const CountBadges: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <div className="relative">
        <span className="text-sm">Notificações</span>
        <Badge className="absolute -top-2 -right-6 px-1.5 min-w-5 h-5 text-xs">3</Badge>
      </div>
      <div className="relative">
        <span className="text-sm">Mensagens</span>
        <Badge variant="destructive" className="absolute -top-2 -right-6 px-1.5 min-w-5 h-5 text-xs">12</Badge>
      </div>
      <div className="relative">
        <span className="text-sm">Tarefas</span>
        <Badge variant="secondary" className="absolute -top-2 -right-6 px-1.5 min-w-5 h-5 text-xs">99+</Badge>
      </div>
    </div>
  ),
};
