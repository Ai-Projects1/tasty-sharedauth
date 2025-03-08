import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderPlus, Users, Trash2 } from "lucide-react";
import Header from "../dashboard/Header";
import Sidebar from "../layout/Sidebar";
import AddGroupModal from "../dashboard/AddGroupModal";
import ShareModal from "../dashboard/ShareModal";
import { useDatabase } from "@/contexts/DatabaseContext";
import { createGroup, createCode, addUserToGroup, deleteGroup } from "@/lib/db/queries";
import { generateCode } from "@/lib/utils/2fa";
import { supabase } from "@/lib/supabase";
import { type Role } from "@/lib/utils/roles";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const GroupsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentRole = localStorage.getItem("userRole") as Role;
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { groups, loading, error, refreshData } = useDatabase();
  
  const toggleMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(prev => !prev);
  }, []);

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;

    try {
      await deleteGroup(selectedGroup.id);
      toast({
        title: "Success",
        description: "Group deleted successfully",
      });
      await refreshData();
    } catch (err: any) {
      console.error("Error deleting group:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to delete group",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedGroup(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar 
          currentRole={currentRole} 
          isMobileSidebarOpen={isMobileSidebarOpen}
          toggleMobileSidebar={toggleMobileSidebar}
        />
        <Header 
          currentRole={currentRole} 
          toggleMobileSidebar={toggleMobileSidebar}
        />
        <main className="flex-1 md:ml-64 ml-0 pt-16 px-4 container mx-auto max-w-7xl">
          <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar 
          currentRole={currentRole} 
          isMobileSidebarOpen={isMobileSidebarOpen}
          toggleMobileSidebar={toggleMobileSidebar}
        />
        <Header 
          currentRole={currentRole} 
          toggleMobileSidebar={toggleMobileSidebar}
        />
        <main className="flex-1 md:ml-64 ml-0 pt-16 px-4 container mx-auto max-w-7xl">
          <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
            <div className="text-destructive">
              Error loading groups: {error.message}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar 
        currentRole={currentRole} 
        isMobileSidebarOpen={isMobileSidebarOpen}
        toggleMobileSidebar={toggleMobileSidebar}
      />
      <Header 
        currentRole={currentRole} 
        toggleMobileSidebar={toggleMobileSidebar}
      />

      <main className="flex-1 md:ml-64 ml-0 pt-16 px-2 sm:px-4 container mx-auto max-w-7xl">
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Groups</h2>
            <Button
              onClick={() => setIsAddGroupModalOpen(true)}
              className="flex items-center gap-2"
            >
              <FolderPlus className="w-4 h-4" />
              <span className="hidden sm:inline">New Group</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {groups.map((group) => (
              <Card 
                key={group.id} 
                className="bg-card hover:bg-card/80 cursor-pointer transition-colors"
                onClick={() => navigate(`/group/${group.id}`)}
              >
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{group.title}</CardTitle>
                      {group.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {group.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <Users className="w-3 h-3" />
                        <span>{group.member_count?.[0]?.count ?? 0}</span>
                      </Badge>
                      {(currentRole === "Admin" || 
                        currentRole === "Manager" || 
                        group.created_by === localStorage.getItem("userId")) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedGroup({
                              id: group.id,
                              title: group.title
                            });
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <div className="text-muted-foreground">
                    {group.codes?.length || 0} code{group.codes?.length !== 1 ? 's' : ''} available
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <AddGroupModal
          open={isAddGroupModalOpen}
          onClose={() => setIsAddGroupModalOpen(false)}
          onSubmit={async (values) => {
            try {
              const userId = localStorage.getItem("userId");
              if (!userId) {
                throw new Error("User not found");
              }
              
              // Create group
              const newGroup = await createGroup({
                title: values.name,
                description: values.description,
                created_by: userId,
                created_at: new Date().toISOString(),
              });
              
              // Add creator to group's user_groups
              await addUserToGroup({
                user_id: userId,
                group_id: newGroup.id,
                created_at: new Date().toISOString(),
              });
              
              // Show success toast
              toast({
                title: "Success",
                description: "Group created successfully",
              });
              
              // Close modal first to improve perceived performance
              setIsAddGroupModalOpen(false);
              
              // Then refresh the data
              await refreshData();
            } catch (err) {
              console.error("Error creating group:", err);
              toast({
                title: "Error",
                description: "Failed to create group",
                variant: "destructive",
              });
            }
          }}
        />

        <ShareModal
          open={isShareModalOpen}
          onOpenChange={setIsShareModalOpen}
          groupId={selectedGroup?.id}
          groupName={selectedGroup?.title}
        />

        <AlertDialog 
          open={isDeleteDialogOpen} 
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Group</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedGroup?.title}"? This action cannot be undone.
                All codes in this group will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={handleDeleteGroup}
              >
                Delete Group
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default GroupsPage;
