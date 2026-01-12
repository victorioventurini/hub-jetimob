import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@/components/ui/button";
import { Mail, Plus, Trash2, Settings, ArrowRight, Download } from "lucide-react";

const meta: Meta<typeof Button> = {
  title: "Componentes Base/Button",
  component: Button,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
O componente Button é o principal elemento de ação do design system.
Suporta múltiplas variantes, tamanhos e estados de loading.

**Uso correto:**
- Use \`default\` para ações primárias
- Use \`secondary\` para ações secundárias
- Use \`destructive\` para ações perigosas (deletar, cancelar)
- Use \`ghost\` para ações terciárias ou em contextos densos
- Use \`accent\` para CTAs de destaque
        `,
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline", "ghost", "link", "accent", "success"],
      description: "Variante visual do botão",
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "xl", "icon", "icon-sm", "icon-lg", "icon-touch"],
      description: "Tamanho do botão",
    },
    isLoading: {
      control: "boolean",
      description: "Estado de loading com spinner",
    },
    disabled: {
      control: "boolean",
      description: "Estado desabilitado",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ============= Variantes =============

export const Default: Story = {
  args: {
    children: "Botão Padrão",
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Botão Secundário",
  },
};

export const Destructive: Story = {
  args: {
    variant: "destructive",
    children: "Deletar",
  },
};

export const Outline: Story = {
  args: {
    variant: "outline",
    children: "Outline",
  },
};

export const Ghost: Story = {
  args: {
    variant: "ghost",
    children: "Ghost",
  },
};

export const Link: Story = {
  args: {
    variant: "link",
    children: "Link Button",
  },
};

export const Accent: Story = {
  args: {
    variant: "accent",
    children: "CTA Destaque",
  },
};

export const Success: Story = {
  args: {
    variant: "success",
    children: "Confirmar",
  },
};

// ============= Tamanhos =============

export const SizeSmall: Story = {
  args: {
    size: "sm",
    children: "Pequeno",
  },
};

export const SizeDefault: Story = {
  args: {
    size: "default",
    children: "Padrão",
  },
};

export const SizeLarge: Story = {
  args: {
    size: "lg",
    children: "Grande",
  },
};

export const SizeXL: Story = {
  args: {
    size: "xl",
    children: "Extra Grande",
  },
};

// ============= Com Ícones =============

export const WithIconLeft: Story = {
  args: {
    children: (
      <>
        <Plus className="w-4 h-4" />
        Novo Item
      </>
    ),
  },
};

export const WithIconRight: Story = {
  args: {
    children: (
      <>
        Próximo
        <ArrowRight className="w-4 h-4" />
      </>
    ),
  },
};

export const IconOnly: Story = {
  args: {
    size: "icon",
    "aria-label": "Configurações",
    children: <Settings className="w-4 h-4" />,
  },
};

export const IconOnlySmall: Story = {
  args: {
    size: "icon-sm",
    variant: "ghost",
    "aria-label": "Deletar",
    children: <Trash2 className="w-4 h-4" />,
  },
};

// ============= Estados =============

export const Loading: Story = {
  args: {
    isLoading: true,
    children: "Salvando...",
  },
};

export const LoadingWithText: Story = {
  args: {
    isLoading: true,
    loadingText: "Processando...",
    children: "Enviar",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: "Desabilitado",
  },
};

// ============= Showcase =============

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="default">Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button variant="accent">Accent</Button>
      <Button variant="success">Success</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Todas as variantes disponíveis do componente Button.",
      },
    },
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
    </div>
  ),
};

export const IconButtons: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="icon-sm" variant="ghost">
        <Mail className="w-4 h-4" />
      </Button>
      <Button size="icon" variant="outline">
        <Settings className="w-4 h-4" />
      </Button>
      <Button size="icon-lg" variant="secondary">
        <Download className="w-5 h-5" />
      </Button>
      <Button size="icon-touch" variant="accent">
        <Plus className="w-5 h-5" />
      </Button>
    </div>
  ),
};
