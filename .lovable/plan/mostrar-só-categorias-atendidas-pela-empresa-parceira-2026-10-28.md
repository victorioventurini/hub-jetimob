# Mostrar só categorias atendidas pela empresa parceira

## Problema
Em Configurações de Tickets > Capacidades, o modal "Adicionar Capacidade" lista todas as categorias externas da BU (ex.: "Contábil"), mesmo que a empresa (Ferrigolo) só atenda "Jurídico".

## O que muda
- O modal passa a listar apenas as categorias que a empresa parceira atende na BU ativa (definidas nos serviços do parceiro).
- Subcategorias: se a empresa atende a categoria inteira, todas aparecem; se atende só algumas subcategorias, aparecem só essas (e a opção "Todas" fica oculta nesse caso).
- Se a empresa não tiver nenhum serviço cadastrado, o modal mostra um aviso "Esta empresa ainda não tem categorias atendidas — configure os serviços do parceiro" e desabilita salvar.
- Vale também para a tela "Minha equipe" (já restrita) — sem mudança lá.
- Proteção no servidor: a validação existente para gestores externos passa a valer também para administradores internos, impedindo salvar capacidade fora dos serviços da empresa.

## Detalhes técnicos
- `ContactCapabilityDialog.tsx`: quando `categoryOptions` não vier, montar opções a partir de `usePartnerServiceMappings(companyId)` (filtro BU) cruzado com `useTicketCategories()`; mapping com `subcategory_id` null = categoria inteira.
- Migração: ajustar `trg_validate_external_capability_scope` para validar para todos os usuários (não só externos) que categoria/subcategoria constam em `partner_service_mappings` ativos da empresa na BU.
- Verificar dados atuais: listar capacidades existentes fora dos serviços (ex.: Ferrigolo em Contábil) e reportar, sem apagar sem confirmação.
