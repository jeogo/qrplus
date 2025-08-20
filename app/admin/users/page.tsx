"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Shield, Loader2 } from "lucide-react"
import { AdminHeader, useAdminLanguage } from "@/components/admin-header"
import { AdminLayout } from "@/components/admin-bottom-nav"
import { getAdminUsersTexts } from "@/lib/i18n/admin-users"
import { UserCard, type CardUser } from './components/user-card'
import { UsersToolbar } from './components/users-toolbar'
import { UsersSkeletonGrid } from './components/users-skeleton-grid'
import { UserDialog } from './components/user-dialog'
import { UsersEmptyState } from './components/empty-state'
import { toast } from 'sonner'

interface User {
  id: number
  username: string
  role: 'waiter' | 'kitchen'
  permissions: { approve_orders: boolean; serve_orders: boolean; make_ready: boolean }
  active: boolean
  created_at: string
  updated_at: string
  // derived permissions list for card (mapped later)
  _derivedPermissions?: { key: string; label: string; active: boolean }[]
}

// i18n handled via external file

export default function UsersAdminPage() {
  const router = useRouter()
  const language = useAdminLanguage()
  const [users, setUsers] = useState<User[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<CardUser | null>(null)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "waiter" as "waiter" | "kitchen",
    permissions: {
      approve_orders: false,
      serve_orders: false,
      make_ready: false,
    },
  })
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const [adminEmail, setAdminEmail] = useState<string>("")
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false)
  // removed unused pendingSave state (lint cleanup)

  const t = useMemo(()=> getAdminUsersTexts(language),[language])

  const api = useCallback(async <T,>(url: string, init?: RequestInit): Promise<T> => {
    const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers||{}) } })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }, [])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<{ success: boolean; data: User[] }>(`/api/admin/users`)
      // map derived permissions for display
      const mapped = data.data.map(u=> ({
        ...u,
        _derivedPermissions: [
          { key:'approve_orders', label: t.approveOrders, active: u.permissions.approve_orders },
          { key:'serve_orders', label: t.serveOrders, active: u.permissions.serve_orders },
          { key:'make_ready', label: t.makeReady, active: u.permissions.make_ready },
        ]
      }))
      setUsers(mapped)
      // Also fetch admin settings for email once
      if (!adminEmail) {
        try {
          const settingsRes = await fetch('/api/admin/settings', { cache: 'no-store' })
          if (settingsRes.ok) {
            const sj = await settingsRes.json()
            if (sj.success && sj.data?.email) setAdminEmail(sj.data.email)
          }
        } catch {}
      }
    } catch (e) {
  console.error('users load failed', e)
  toast.error(t.loadError)
    } finally {
      setLoading(false)
    }
  }, [api, adminEmail, t.approveOrders, t.serveOrders, t.makeReady, t.loadError])

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
    void loadUsers()
  }, [loadUsers])

  if (!mounted) {
    return null
  }

  const handleAddUser = () => {
    setEditingUser(null)
    setFormData({
      username: "",
      password: "",
      role: "waiter",
      permissions: {
        approve_orders: false,
        serve_orders: false,
        make_ready: false,
      },
    })
    setIsDialogOpen(true)
  }

  const handleEditUser = (user: CardUser) => {
    setEditingUser(user)
    setFormData({
      username: user.username ?? "",
      password: "",
      role: user.role,
      permissions: {
        approve_orders: user.permissions?.approve_orders ?? false,
        serve_orders: user.permissions?.serve_orders ?? false,
        make_ready: user.permissions?.make_ready ?? false,
      },
    })
    setIsDialogOpen(true)
  }

  const handleDeleteUser = async (userId: number) => {
    if (deletingId) return
    setDeletingId(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('delete failed')
      setUsers(users.filter(u=>u.id!==userId))
      toast.success(t.deleted)
    } catch (e) {
      console.error(e)
      toast.error(t.deleteError)
    } finally { setDeletingId(null) }
  }

  const performSave = async () => {
    if (!formData.username.trim()) return
    setSaving(true)
    try {
      if (editingUser) {
        const payload: { username: string; role: 'waiter' | 'kitchen'; permissions: User['permissions']; password?: string } = { username: formData.username, role: formData.role, permissions: formData.permissions }
        if (formData.password) payload.password = formData.password
        // optimistic update
        const optimisticUsers = users.map(u=> u.id===editingUser.id? { ...u, username: payload.username, role: payload.role, permissions: payload.permissions, _derivedPermissions:[
          { key:'approve_orders', label: t.approveOrders, active: payload.permissions.approve_orders },
          { key:'serve_orders', label: t.serveOrders, active: payload.permissions.serve_orders },
          { key:'make_ready', label: t.makeReady, active: payload.permissions.make_ready },
        ], __flash:true }: u)
        setUsers(optimisticUsers)
        const res = await fetch(`/api/admin/users/${editingUser.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
        if (!res.ok) throw new Error('update failed')
        const json = await res.json()
        setUsers(users.map(u=>u.id===editingUser.id? { ...json.data, _derivedPermissions: [
          { key:'approve_orders', label: t.approveOrders, active: json.data.permissions.approve_orders },
          { key:'serve_orders', label: t.serveOrders, active: json.data.permissions.serve_orders },
          { key:'make_ready', label: t.makeReady, active: json.data.permissions.make_ready },
        ], __flash:true } : u))
        toast.success(t.updated)
      } else {
        const tempId = Date.now()*-1
        const optimistic = { id: tempId, username: formData.username, role: formData.role, permissions: formData.permissions, active:true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), _derivedPermissions:[
          { key:'approve_orders', label: t.approveOrders, active: formData.permissions.approve_orders },
          { key:'serve_orders', label: t.serveOrders, active: formData.permissions.serve_orders },
          { key:'make_ready', label: t.makeReady, active: formData.permissions.make_ready },
        ], __flash:true }
  setUsers([...users, optimistic])
        const res = await fetch(`/api/admin/users`, { method: 'POST', body: JSON.stringify({ username: formData.username, password: formData.password, role: formData.role, permissions: formData.permissions }) })
        if (!res.ok) throw new Error('create failed')
        const json = await res.json()
        setUsers(prev=> prev.map(u=> u.id===tempId? { ...json.data, _derivedPermissions:[
          { key:'approve_orders', label: t.approveOrders, active: json.data.permissions.approve_orders },
          { key:'serve_orders', label: t.serveOrders, active: json.data.permissions.serve_orders },
          { key:'make_ready', label: t.makeReady, active: json.data.permissions.make_ready },
        ], __flash:true }: u))
        toast.success(t.created)
      }
      setIsDialogOpen(false)
    } catch (e) {
      console.error(e)
      toast.error(t.saveError)
      // rollback by reloading
      void loadUsers()
  } finally { setSaving(false); setConfirmSaveOpen(false) }
  }

  const requestSave = () => {
    setConfirmSaveOpen(true)
  }

  const handleRoleChange = (role: "waiter" | "kitchen") => {
    setFormData({
      ...formData,
      role,
      permissions: {
  approve_orders: false,
        serve_orders: role === "waiter",
        make_ready: role === "kitchen",
      },
    })
  toast.info(t.roleChangedNote)
  }

  const handlePermissionChange = (permission: keyof User["permissions"], value: boolean) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [permission]: value,
      },
    })
  }

  const filtered = users.filter(u=> u.username.toLowerCase().includes(search.toLowerCase()))

  return (
    <AdminLayout>
      <AdminHeader 
        title={t.title} 
        showBackButton={true}
        onBackClick={() => router.push('/admin/dashboard')}
      />

      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 container mx-auto px-4 py-6 space-y-6">
        <UsersToolbar 
          onAdd={handleAddUser} 
          onRefresh={()=> { toast.info(t.refresh); void loadUsers() }} 
          onSearch={setSearch}
          texts={{ search: t.searchPlaceholder, add: t.addUser, refresh: t.refresh, clear: t.cancel }}
        />
        {/* Current Admin User Card */}
        <Card className="mb-6 border-primary/20 bg-primary/5 animate-fade-in-down">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">{t.currentAdmin}</CardTitle>
                <p className="text-sm text-muted-foreground">{adminEmail || '—'}</p>
              </div>
              <Badge variant="default" className="ml-auto">
                ADMIN
              </Badge>
            </div>
          </CardHeader>
        </Card>
        {/* Users Grid */}
        {loading ? (
          <UsersSkeletonGrid />
        ) : filtered.length === 0 ? (
          <UsersEmptyState title={t.noUsers} description={t.addFirst} cta={t.addUser} onAdd={handleAddUser} />
        ) : (
          <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((user)=> (
              <UserCard 
                key={user.id} 
                user={user} 
                isEditing={editingUser?.id===user.id}
                onEdit={handleEditUser}
                onDelete={(u)=> handleDeleteUser(u.id)}
                texts={{ waiter: t.roles.waiter, kitchen: t.roles.kitchen, edit: t.edit, del: t.delete, permissions: t.permissions }}
                // highlight new/updated
                // wrapper class injection after rendering
              />
            ))}
          </div>
        )}

        <UserDialog 
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          editing={!!editingUser}
          language={language}
          saving={saving}
          formData={formData}
          setFormData={d=> setFormData(d)}
          t={t}
          onRoleChange={handleRoleChange}
          onPermissionChange={handlePermissionChange}
          onRequestSave={requestSave}
        />

        {/* Confirm Save Dialog */}
        <AlertDialog open={confirmSaveOpen} onOpenChange={setConfirmSaveOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.confirmSaveTitle}</AlertDialogTitle>
              <AlertDialogDescription>{t.confirmSaveDesc}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>{t.cancel}</AlertDialogCancel>
              <AlertDialogAction onClick={performSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}{t.confirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </AdminLayout>
  )
}
