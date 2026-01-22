/**
 * TicketDetailSidebar Component
 * 
 * Displays ticket details in a sidebar, including status, responsible,
 * creator, visibility, viewers, and mentions.
 * 
 * Extracted from TicketDetailPage for better modularity.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Building2, Users, AtSign, ArrowRightLeft } from "lucide-react";
import { UserLink, ContactLink } from "@/components/links";
import { TicketStatusSelector } from "./TicketStatusSelector";
import type { TicketStatus } from "../types";

interface TicketOwner {
  id: string;
  display_name: string | null;
  photo_url: string | null;
}

interface TicketContact {
  id: string;
  name: string | null;
  email: string | null;
}

interface TicketCategory {
  id: string;
  name: string;
}

interface PartnerCompany {
  id: string;
  name: string;
}

interface ViewerTeam {
  id: string;
  name: string;
}

interface ViewerUser {
  id: string;
  display_name: string | null;
  photo_url: string | null;
}

interface Mention {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  type: "user" | "contact";
}

interface ViewersData {
  teams?: ViewerTeam[];
  users?: ViewerUser[];
  mentions?: Mention[];
}

interface TicketDetailSidebarProps {
  ticketType: "internal" | "external";
  status: TicketStatus;
  visibility: "bu_all" | "teams" | "users" | "private";
  owner?: TicketOwner | null;
  assignedContact?: TicketContact | null;
  createdBy?: TicketOwner | null;
  category?: TicketCategory | null;
  subcategory?: TicketCategory | null;
  partnerCompany?: PartnerCompany | null;
  viewersData?: ViewersData | null;
  canChangeStatus: boolean;
  isUpdatingStatus: boolean;
  onStatusChange: (status: TicketStatus) => void;
  onTransferClick: () => void;
}

export function TicketDetailSidebar({
  ticketType,
  status,
  visibility,
  owner,
  assignedContact,
  createdBy,
  category,
  subcategory,
  partnerCompany,
  viewersData,
  canChangeStatus,
  isUpdatingStatus,
  onStatusChange,
  onTransferClick,
}: TicketDetailSidebarProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Status Selector */}
          <TicketStatusSelector
            value={status}
            onChange={onStatusChange}
            disabled={!canChangeStatus}
            isUpdating={isUpdatingStatus}
          />

          <Separator />

          {/* Partner Company */}
          {ticketType === "external" && partnerCompany && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Empresa Parceira</p>
              <div className="flex items-center gap-2 p-2 -mx-2 rounded-md bg-muted/30">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium">{partnerCompany.name}</span>
              </div>
            </div>
          )}

          {/* Category */}
          {category && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Categoria</p>
              <p className="text-sm font-medium">
                {category.name}
                {subcategory && ` → ${subcategory.name}`}
              </p>
            </div>
          )}

          {/* Responsible - External: assigned_contact, Internal: owner */}
          {ticketType === "external" && assignedContact ? (
            <ResponsibleSection
              type="contact"
              contact={assignedContact}
              onTransferClick={onTransferClick}
            />
          ) : owner ? (
            <ResponsibleSection
              type="user"
              user={owner}
              onTransferClick={onTransferClick}
            />
          ) : null}

          {/* Creator */}
          {createdBy && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Criado por</p>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={createdBy.photo_url ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {createdBy.display_name?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <UserLink
                  profileId={createdBy.id}
                  displayName={createdBy.display_name || "Usuário"}
                  openInNewTab
                  className="text-sm"
                />
              </div>
            </div>
          )}

          {/* Visibility */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Visibilidade</p>
            <p className="text-sm">
              {visibility === "bu_all" && "Toda a BU"}
              {visibility === "teams" && "Times específicos"}
              {visibility === "users" && "Usuários específicos"}
              {visibility === "private" && "Privado"}
            </p>
          </div>

          {/* Viewers - Teams */}
          {visibility === "teams" && viewersData?.teams && viewersData.teams.length > 0 && (
            <ViewersTeamsSection teams={viewersData.teams} />
          )}

          {/* Viewers - Users */}
          {visibility === "users" && viewersData?.users && viewersData.users.length > 0 && (
            <ViewersUsersSection users={viewersData.users} />
          )}

          {/* Mentioned Users */}
          {viewersData?.mentions && viewersData.mentions.length > 0 && (
            <MentionsSection mentions={viewersData.mentions} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Sub-components

interface ResponsibleSectionProps {
  type: "user" | "contact";
  user?: TicketOwner | null;
  contact?: TicketContact | null;
  onTransferClick: () => void;
}

function ResponsibleSection({ type, user, contact, onTransferClick }: ResponsibleSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-muted-foreground">Responsável</p>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={onTransferClick}
          title="Transferir ticket"
        >
          <ArrowRightLeft className="h-3 w-3" />
        </Button>
      </div>
      {type === "contact" && contact ? (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs bg-muted">
              {contact.name?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <ContactLink
              contactId={contact.id}
              displayName={contact.name || "Contato"}
              openInNewTab
              className="text-sm"
            />
            <span className="text-xs text-muted-foreground">{contact.email}</span>
          </div>
        </div>
      ) : user ? (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={user.photo_url ?? undefined} />
            <AvatarFallback className="text-xs">
              {user.display_name?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <UserLink
            profileId={user.id}
            displayName={user.display_name || "Usuário"}
            openInNewTab
            className="text-sm"
          />
        </div>
      ) : null}
    </div>
  );
}

function ViewersTeamsSection({ teams }: { teams: ViewerTeam[] }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
        <Users className="h-3 w-3" />
        Visualizadores (Times)
      </p>
      <div className="flex flex-wrap gap-1.5">
        {teams.map((team) => (
          <Badge key={team.id} variant="secondary" className="text-xs">
            {team.name}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function ViewersUsersSection({ users }: { users: ViewerUser[] }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
        <Users className="h-3 w-3" />
        Visualizadores (Usuários)
      </p>
      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.id} className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={user.photo_url ?? undefined} />
              <AvatarFallback className="text-[10px]">
                {user.display_name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <UserLink
              profileId={user.id}
              displayName={user.display_name || "Usuário"}
              openInNewTab
              className="text-xs"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function MentionsSection({ mentions }: { mentions: Mention[] }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
        <AtSign className="h-3 w-3" />
        Mencionados
      </p>
      <div className="space-y-2">
        {mentions.map((mention) => (
          <div key={mention.id} className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={mention.photo_url ?? undefined} />
              <AvatarFallback className="text-[10px] bg-muted">
                {mention.display_name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {mention.type === "user" ? (
              <UserLink
                profileId={mention.id}
                displayName={mention.display_name || "Usuário"}
                openInNewTab
                className="text-xs"
              />
            ) : (
              <span className="text-xs">{mention.display_name}</span>
            )}
            {mention.type === "contact" && (
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                Externo
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
