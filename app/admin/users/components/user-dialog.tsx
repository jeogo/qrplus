"use client"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { ReactNode } from 'react'

export interface UserDialogProps {
  open: boolean
  onOpenChange: (v:boolean)=>void
  editing: boolean
  language: string
  saving: boolean
  formData: {
    username: string
    password: string
    role: 'waiter' | 'kitchen'
    permissions: { approve_orders:boolean; serve_orders:boolean; make_ready:boolean }
  }
  setFormData: (d:UserDialogProps['formData'])=>void
  t: {
    editUser:string; addUser:string; password:string; passwordLeaveBlank:string; username:string; role:string; permissions:string; approveOrders:string; serveOrders:string; makeReady:string; cancel:string; save:string; roles:{ waiter:string; kitchen:string }
  }
  onRoleChange: (r:'waiter'|'kitchen')=>void
  onPermissionChange: (key: keyof UserDialogProps['formData']['permissions'], v:boolean)=>void
  onRequestSave: ()=>void
  extraFooter?: ReactNode
}

export function UserDialog({ open, onOpenChange, editing, language, saving, formData, setFormData, t, onRoleChange, onPermissionChange, onRequestSave, extraFooter }: UserDialogProps){
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] animate-scale-in">
        <DialogHeader>
          <DialogTitle>{editing ? t.editUser : t.addUser}</DialogTitle>
          <DialogDescription>
            {editing ? (language==='ar'? 'قم بتحديث معلومات المستخدم وحفظ التغييرات':'Mettez à jour les informations de l\'utilisateur puis enregistrez') : (language==='ar'? 'أدخل بيانات المستخدم الجديد ثم احفظ':'Renseignez les détails du nouvel utilisateur puis enregistrez')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="username">{t.username}</Label>
            <Input id="username" value={formData.username} onChange={e=> setFormData({ ...formData, username:e.target.value })} required className="form-field" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">{t.password}</Label>
            <Input id="password" type="password" value={formData.password} onChange={e=> setFormData({ ...formData, password:e.target.value })} required={!editing} placeholder={editing? t.passwordLeaveBlank: ''} className="form-field" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">{t.role}</Label>
            <Select value={formData.role} onValueChange={(v: string)=> onRoleChange(v as 'waiter'|'kitchen')}>
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
                <Label htmlFor="approve_orders" className="text-sm font-normal">{t.approveOrders}</Label>
                <Switch id="approve_orders" checked={formData.permissions.approve_orders} onCheckedChange={(c:boolean)=> onPermissionChange('approve_orders', c)} disabled={formData.role==='kitchen'} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="serve_orders" className="text-sm font-normal">{t.serveOrders}</Label>
                <Switch id="serve_orders" checked={formData.permissions.serve_orders} onCheckedChange={(c:boolean)=> onPermissionChange('serve_orders', c)} disabled={formData.role==='kitchen'} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="make_ready" className="text-sm font-normal">{t.makeReady}</Label>
                <Switch id="make_ready" checked={formData.permissions.make_ready} onCheckedChange={(c:boolean)=> onPermissionChange('make_ready', c)} disabled={formData.role==='waiter'} />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          {extraFooter}
          <Button type="button" variant="outline" disabled={saving} onClick={()=> onOpenChange(false)}>{t.cancel}</Button>
          <Button onClick={onRequestSave} disabled={saving} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border-0 shadow-md">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{t.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}