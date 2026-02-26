/**
 * SegmentationCharts — Donut charts for location, job title, company type
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PARTICIPANTS_MOCK } from "../../mocks/participants";

const COLORS = [
  "hsl(210, 80%, 45%)", "hsl(210, 80%, 65%)", "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)", "hsl(0, 72%, 55%)", "hsl(280, 60%, 55%)",
  "hsl(180, 50%, 45%)", "hsl(330, 60%, 55%)", "hsl(60, 70%, 45%)",
  "hsl(120, 40%, 50%)",
];

function countBy<T>(arr: T[], key: (item: T) => string): { name: string; value: number }[] {
  const map = new Map<string, number>();
  arr.forEach((item) => {
    const k = key(item);
    map.set(k, (map.get(k) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function DonutChart({ data, title, actions }: { data: { name: string; value: number }[]; title: string; actions?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {actions}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              dataKey="value"
              paddingAngle={2}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
              style={{ fontSize: 9 }}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/** Unique UFs from mock data */
const ALL_UFS = Array.from(new Set(PARTICIPANTS_MOCK.map((p) => p.uf))).sort();

export function SegmentationCharts() {
  const [selectedUf, setSelectedUf] = useState<string>("all");

  const filtered = selectedUf === "all"
    ? PARTICIPANTS_MOCK
    : PARTICIPANTS_MOCK.filter((p) => p.uf === selectedUf);

  const locationData = selectedUf === "all"
    ? countBy(filtered, (p) => p.uf)
    : countBy(filtered, (p) => p.city);

  const byJob = countBy(filtered, (p) => p.jobTitle);
  const byCompany = countBy(filtered, (p) => p.companyType);

  const ufFilter = (
    <Select value={selectedUf} onValueChange={setSelectedUf}>
      <SelectTrigger className="h-7 w-[110px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas UFs</SelectItem>
        {ALL_UFS.map((uf) => (
          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <DonutChart data={locationData} title="Distribuição por localidade" actions={ufFilter} />
      <DonutChart data={byJob} title="Distribuição por Cargo" />
      <DonutChart data={byCompany} title="Distribuição por Tipo de Empresa" />
    </div>
  );
}
