import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { BaseModelConfig } from "@/lib/types/model-config";

interface ConnectionListProps<T extends BaseModelConfig> {
  title: string;
  description: string;
  connections: T[];
  onAdd: (config: T) => void;
  onEdit: (connection: T) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  renderConnectionInfo: (connection: T) => React.ReactNode;
  renderEditForm: (props: { 
    connection?: T; 
    onCancel: () => void; 
    onSubmit: (config: T) => void;
  }) => React.ReactNode;
}

const ConnectionList = <T extends BaseModelConfig>({
  title,
  description,
  connections,
  onAdd,
  onEdit,
  onDelete,
  onToggle,
  renderConnectionInfo,
  renderEditForm,
}: ConnectionListProps<T>) => {
  const [editingConnection, setEditingConnection] = useState<T | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleEdit = (connection: T) => {
    setEditingConnection(connection);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingConnection(undefined);
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setEditingConnection(undefined);
    setIsDialogOpen(false);
  };

  const handleSubmit = (config: T) => {
    if (editingConnection) {
      onEdit(config);
    } else {
      onAdd(config);
    }
    handleClose();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button onClick={handleAdd} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Connection
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {connections.map((connection) => (
            <div
              key={connection.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center space-x-4">
                <Switch
                  checked={connection.enabled}
                  onCheckedChange={(checked) => onToggle(connection.id, checked)}
                />
                <div>
                  <div className="font-medium flex items-center space-x-2">
                    <span>{connection.name}</span>
                    <Badge variant={connection.enabled ? "default" : "secondary"}>
                      {connection.enabled ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {renderConnectionInfo(connection)}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(connection)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(connection.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {connections.length === 0 && (
            <div className="text-center p-4 text-muted-foreground">
              No connections configured. Click "Add Connection" to get started.
            </div>
          )}
        </div>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingConnection ? "Edit Connection" : "Add New Connection"}
            </DialogTitle>
            <DialogDescription>
              Configure your connection settings below.
            </DialogDescription>
          </DialogHeader>
          {renderEditForm({
            connection: editingConnection,
            onCancel: handleClose,
            onSubmit: handleSubmit
          })}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export { ConnectionList }; 