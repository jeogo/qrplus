"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Plus, Edit, Trash2, Users, Shield, CheckCircle, Loader2, RefreshCw, Search } from "lucide-react"
import { AdminHeader, useAdminLanguage } from "@/components/admin-header"
import { AdminLayout } from "@/components/admin-bottom-nav"
import { getAdminUsersTexts } from "@/lib/i18n/admin-users"

interface User {
  id: number
  username: string
  role: 'waiter' | 'kitchen'
  permissions: { approve_orders: boolean; serve_orders: boolean; make_ready: boolean }
  active: boolean
  created_at: string
  updated_at: string
}

// i18n handled via external file

export default function UsersAdminPage() {
  const router = useRouter()
  const language = useAdminLanguage()
  const [users, setUsers] = useState<User[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
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
      setUsers(data.data)
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
      console.log('Admin: Error loading users')
    } finally {
      setLoading(false)
    }
  }, [api, adminEmail])

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

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      password: "",
      role: user.role,
      permissions: { ...user.permissions },
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
      console.log('Admin: User deleted successfully')
    } catch (e) {
      console.error(e)
      console.log('Admin: Error deleting user')
    } finally { setDeletingId(null) }
  }

  const handleSave = async () => {
    if (!formData.username.trim()) return
    setSaving(true)
    try {
      if (editingUser) {
  const payload: { username: string; role: 'waiter' | 'kitchen'; permissions: User['permissions']; password?: string } = { username: formData.username, role: formData.role, permissions: formData.permissions }
        if (formData.password) payload.password = formData.password
        const res = await fetch(`/api/admin/users/${editingUser.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
        if (!res.ok) throw new Error('update failed')
        const json = await res.json()
        setUsers(users.map(u=>u.id===editingUser.id? json.data : u))
        console.log('Admin: User updated successfully')
      } else {
        const res = await fetch(`/api/admin/users`, { method: 'POST', body: JSON.stringify({ username: formData.username, password: formData.password, role: formData.role, permissions: formData.permissions }) })
        if (!res.ok) throw new Error('create failed')
        const json = await res.json()
        setUsers([...users, json.data])
        console.log('Admin: User created successfully')
      }
      setIsDialogOpen(false)
    } catch (e) {
      console.error(e)
      console.log('Admin: Error saving user')
    } finally { setSaving(false) }
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
        {/* Actions Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/50 p-4 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder={t.searchPlaceholder} value={search} onChange={e=>setSearch(e.target.value)} className="pl-10" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={()=> { setSearch(''); void loadUsers() }} className="flex items-center gap-2"><RefreshCw className="h-4 w-4" />{t.refresh}</Button>
            <Button onClick={handleAddUser} className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border-0 shadow-md"><Plus className="h-4 w-4" /> {t.addUser}</Button>
          </div>
        </div>
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
          <div className="text-center py-24">
            <Loader2 className="h-10 w-10 mx-auto mb-4 animate-spin text-blue-600" />
            <p className="text-slate-500">{t.loadError.replace(/ .*/, '')}...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-slate-200/50 shadow-sm">
            <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">{t.noUsers}</h3>
            <p className="text-muted-foreground">{t.addFirst}</p>
            <Button onClick={handleAddUser} className="mt-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">{t.addUser}</Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((user, index) => (
              <Card
                key={user.id}
                className="hover-lift interactive animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {user.username}
                        <Badge variant={user.role === "waiter" ? "default" : "secondary"} className={user.role==='waiter'? 'bg-blue-100 text-blue-700':'bg-amber-100 text-amber-700'}>
                          {user.role === "waiter" ? t.roles.waiter : t.roles.kitchen}
                        </Badge>
                      </CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)} className="interactive">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive interactive"
                            disabled={deletingId===user.id}
                          >
                            {deletingId===user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="animate-scale-in">
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t.confirmDeleteTitle}</AlertDialogTitle>
                            <AlertDialogDescription>{t.confirmDeleteDesc}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteUser(user.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              {t.delete}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">{t.permissions}:</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{t.approveOrders}</span>
                        <div className="flex items-center gap-1">
                          {user.permissions.approve_orders ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                          )}
                          <span className="text-muted-foreground">{user.permissions.approve_orders ? t.yes : t.no}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>{t.serveOrders}</span>
                        <div className="flex items-center gap-1">
                          {user.permissions.serve_orders ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                          )}
                          <span className="text-muted-foreground">{user.permissions.serve_orders ? t.yes : t.no}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>{t.makeReady}</span>
                        <div className="flex items-center gap-1">
                          {user.permissions.make_ready ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                          )}
                          <span className="text-muted-foreground">{user.permissions.make_ready ? t.yes : t.no}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit User Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px] animate-scale-in">
            <DialogHeader>
              <DialogTitle>{editingUser ? t.editUser : t.addUser}</DialogTitle>
              <DialogDescription>
                {editingUser ? (language==='ar'? 'قم بتحديث معلومات المستخدم وحفظ التغييرات':'Mettez à jour les informations de l\'utilisateur puis enregistrez') : (language==='ar'? 'أدخل بيانات المستخدم الجديد ثم احفظ':'Renseignez les détails du nouvel utilisateur puis enregistrez')}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="username">{t.username}</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  className="form-field"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">{t.password}</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                  placeholder={editingUser ? t.passwordLeaveBlank : ""}
                  className="form-field"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="role">{t.role}</Label>
                <Select value={formData.role} onValueChange={handleRoleChange}>
                  <SelectTrigger className="form-field">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="waiter">{t.roles.waiter}</SelectItem>
                    <SelectItem value="kitchen">{t.roles.kitchen}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3">
                <Label>{t.permissions}</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="approve_orders" className="text-sm font-normal">
                      {t.approveOrders}
                    </Label>
                    <Switch
                      id="approve_orders"
                      checked={formData.permissions.approve_orders}
                      onCheckedChange={(checked) => handlePermissionChange("approve_orders", checked)}
                      disabled={formData.role === "kitchen"}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="serve_orders" className="text-sm font-normal">
                      {t.serveOrders}
                    </Label>
                    <Switch
                      id="serve_orders"
                      checked={formData.permissions.serve_orders}
                      onCheckedChange={(checked) => handlePermissionChange("serve_orders", checked)}
                      disabled={formData.role === "kitchen"}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="make_ready" className="text-sm font-normal">
                      {t.makeReady}
                    </Label>
                    <Switch
                      id="make_ready"
                      checked={formData.permissions.make_ready}
                      onCheckedChange={(checked) => handlePermissionChange("make_ready", checked)}
                      disabled={formData.role === "waiter"}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" disabled={saving} onClick={() => setIsDialogOpen(false)}>
                {t.cancel}
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border-0 shadow-md">
                {saving ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />{t.save}</>) : t.save}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </AdminLayout>
  )
}
