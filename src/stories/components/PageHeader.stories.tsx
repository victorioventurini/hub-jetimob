import type { Meta, StoryObj } from "@storybook/react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Download, Filter, Users, FileText, BarChart3 } from "lucide-react";

const meta: Meta<typeof PageHeader> = {
  title: "Layout/PageHeader",
  component: PageHeader,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: `
O PageHeader é o componente canônico para cabeçalhos de página.
Deve ser usado em TODAS as páginas para garantir consistência.

**Anatomia:**
- Botão de voltar (opcional)
- Ícone (opcional)  
- Título (obrigatório)
- Descrição (opcional)
- Actions (opcional, alinhadas à direita)

**Boas práticas:**
- Sempre use PageHeader, nunca crie headers customizados
- Use \`backTo\` para navegação hierárquica
- Actions devem ter no máximo 2-3 botões
        `,
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    title: {
      control: "text",
      description: "Título da página (obrigatório)",
    },
    description: {
      control: "text",
      description: "Descrição/subtítulo",
    },
    backTo: {
      control: "text",
      description: "Link para botão de voltar",
    },
    backLabel: {
      control: "text",
      description: "Label do botão voltar",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ============= Básico =============

export const Default: Story = {
  args: {
    title: "Título da Página",
  },
};

export const WithDescription: Story = {
  args: {
    title: "Configurações",
    description: "Gerencie as configurações do sistema",
  },
};

export const WithBackButton: Story = {
  args: {
    title: "Detalhes do Item",
    description: "Visualize e edite informações",
    backTo: "/items",
  },
};

export const WithCustomBackLabel: Story = {
  args: {
    title: "Editar Usuário",
    backTo: "/users",
    backLabel: "Voltar para usuários",
  },
};

// ============= Com Ícone =============

export const WithIcon: Story = {
  args: {
    title: "Equipes",
    description: "Gerencie as equipes da organização",
    icon: <Users className="w-8 h-8 text-primary" />,
  },
};

export const WithIconAndBack: Story = {
  args: {
    title: "Relatórios",
    description: "Visualize métricas e análises",
    icon: <BarChart3 className="w-8 h-8 text-accent" />,
    backTo: "/dashboard",
  },
};

// ============= Com Actions =============

export const WithSingleAction: Story = {
  args: {
    title: "Documentos",
    description: "Gerencie seus documentos",
    icon: <FileText className="w-8 h-8 text-primary" />,
    actions: (
      <Button>
        <Plus className="w-4 h-4" />
        Novo Documento
      </Button>
    ),
  },
};

export const WithMultipleActions: Story = {
  args: {
    title: "Usuários",
    description: "Gerencie os usuários do sistema",
    icon: <Users className="w-8 h-8 text-primary" />,
    actions: (
      <>
        <Button variant="outline">
          <Filter className="w-4 h-4" />
          Filtros
        </Button>
        <Button variant="outline">
          <Download className="w-4 h-4" />
          Exportar
        </Button>
        <Button>
          <Plus className="w-4 h-4" />
          Novo Usuário
        </Button>
      </>
    ),
  },
};

// ============= Completo =============

export const FullExample: Story = {
  args: {
    title: "Configurações do Sistema",
    description: "Gerencie todas as configurações da plataforma",
    icon: <Settings className="w-8 h-8 text-muted-foreground" />,
    backTo: "/",
    backLabel: "Voltar ao início",
    actions: (
      <>
        <Button variant="outline">Cancelar</Button>
        <Button>Salvar Alterações</Button>
      </>
    ),
  },
};

// ============= Showcase =============

export const AllVariations: Story = {
  render: () => (
    <div className="space-y-12">
      <div className="border-b pb-4">
        <h3 className="text-sm font-medium mb-4 text-muted-foreground">Simples</h3>
        <PageHeader title="Título Simples" />
      </div>
      
      <div className="border-b pb-4">
        <h3 className="text-sm font-medium mb-4 text-muted-foreground">Com descrição</h3>
        <PageHeader 
          title="Com Descrição" 
          description="Uma descrição explicativa sobre esta seção"
        />
      </div>
      
      <div className="border-b pb-4">
        <h3 className="text-sm font-medium mb-4 text-muted-foreground">Com ícone</h3>
        <PageHeader 
          title="Com Ícone" 
          description="Ícones ajudam na identificação visual"
          icon={<Settings className="w-8 h-8 text-primary" />}
        />
      </div>
      
      <div className="border-b pb-4">
        <h3 className="text-sm font-medium mb-4 text-muted-foreground">Com actions</h3>
        <PageHeader 
          title="Com Actions" 
          description="Ações são alinhadas à direita"
          actions={
            <>
              <Button variant="outline">Cancelar</Button>
              <Button>Salvar</Button>
            </>
          }
        />
      </div>
      
      <div>
        <h3 className="text-sm font-medium mb-4 text-muted-foreground">Completo</h3>
        <PageHeader 
          title="Header Completo" 
          description="Todas as opções combinadas"
          icon={<Users className="w-8 h-8 text-primary" />}
          backTo="/"
          actions={
            <>
              <Button variant="ghost" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
              <Button>
                <Plus className="w-4 h-4" />
                Novo
              </Button>
            </>
          }
        />
      </div>
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};
