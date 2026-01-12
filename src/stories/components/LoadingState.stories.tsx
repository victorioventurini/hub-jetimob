import type { Meta, StoryObj } from "@storybook/react";
import { 
  LoadingState, 
  LoadingSpinner, 
  SkeletonCard, 
  SkeletonList, 
  SkeletonTable 
} from "@/components/ui/loading-state";

const meta: Meta<typeof LoadingState> = {
  title: "Layout/LoadingState",
  component: LoadingState,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
Componentes de loading para diferentes contextos.

**Componentes disponíveis:**
- \`LoadingState\`: Loading de página/seção completa
- \`LoadingSpinner\`: Spinner inline
- \`SkeletonCard\`: Skeleton de card
- \`SkeletonList\`: Skeleton de lista
- \`SkeletonTable\`: Skeleton de tabela

**Boas práticas:**
- Use Skeleton para preservar layout durante load
- Use LoadingSpinner para operações inline
- Sempre forneça texto de loading quando possível
        `,
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

// ============= LoadingState =============

export const Default: Story = {
  args: {
    text: "Carregando...",
  },
};

export const CustomText: Story = {
  args: {
    text: "Buscando dados...",
  },
};

export const NoText: Story = {
  args: {
    text: undefined,
  },
};

export const FullPage: Story = {
  args: {
    fullPage: true,
    text: "Carregando página...",
  },
  parameters: {
    layout: "fullscreen",
  },
};

// ============= LoadingSpinner =============

export const SpinnerSmall: Story = {
  render: () => <LoadingSpinner size="sm" />,
};

export const SpinnerMedium: Story = {
  render: () => <LoadingSpinner size="md" text="Processando" />,
};

export const SpinnerLarge: Story = {
  render: () => <LoadingSpinner size="lg" text="Aguarde..." />,
};

export const SpinnerSizes: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <LoadingSpinner size="sm" text="Small" />
      <LoadingSpinner size="md" text="Medium" />
      <LoadingSpinner size="lg" text="Large" />
    </div>
  ),
};

// ============= SkeletonCard =============

export const CardBasic: Story = {
  render: () => <SkeletonCard className="w-80" />,
};

export const CardWithAvatar: Story = {
  render: () => <SkeletonCard className="w-80" showAvatar />,
};

export const CardWithImage: Story = {
  render: () => <SkeletonCard className="w-80" showImage />,
};

export const CardFull: Story = {
  render: () => <SkeletonCard className="w-80" showImage showAvatar lines={4} />,
};

// ============= SkeletonList =============

export const ListCards: Story = {
  render: () => <SkeletonList count={3} variant="card" className="w-80" />,
};

export const ListRows: Story = {
  render: () => <SkeletonList count={5} variant="row" className="w-96" />,
};

export const ListRowsWithAvatar: Story = {
  render: () => <SkeletonList count={5} variant="row" showAvatar className="w-96" />,
};

export const ListCompact: Story = {
  render: () => <SkeletonList count={6} variant="compact" className="w-64" />,
};

export const ListCompactWithAvatar: Story = {
  render: () => <SkeletonList count={6} variant="compact" showAvatar className="w-64" />,
};

// ============= SkeletonTable =============

export const TableDefault: Story = {
  render: () => <SkeletonTable className="w-full max-w-2xl" />,
};

export const TableCustom: Story = {
  render: () => <SkeletonTable rows={3} columns={6} className="w-full max-w-3xl" />,
};

export const TableLarge: Story = {
  render: () => <SkeletonTable rows={10} columns={5} className="w-full max-w-4xl" />,
  parameters: {
    layout: "padded",
  },
};

// ============= Showcase =============

export const AllSkeletonVariants: Story = {
  render: () => (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h3 className="text-sm font-medium mb-4 text-muted-foreground">Cards</h3>
        <div className="flex gap-4">
          <SkeletonCard className="w-64" />
          <SkeletonCard className="w-64" showAvatar />
          <SkeletonCard className="w-64" showImage />
        </div>
      </div>
      
      <div>
        <h3 className="text-sm font-medium mb-4 text-muted-foreground">List Rows</h3>
        <SkeletonList count={3} variant="row" showAvatar />
      </div>
      
      <div>
        <h3 className="text-sm font-medium mb-4 text-muted-foreground">Table</h3>
        <SkeletonTable rows={4} columns={4} />
      </div>
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};
