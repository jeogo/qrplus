"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
import { Plus, Edit, Trash2, Download, QrCode, ExternalLink, RefreshCw, Loader2 } from "lucide-react"
import QRCode from "qrcode"
import { AdminHeader, useAdminLanguage } from "@/components/admin-header"
import { AdminLayout } from "@/components/admin-bottom-nav"
import { getAdminTablesTexts } from "@/lib/i18n/admin-tables"

interface Table {
  id: number
  table_number: number
  qr_code: string
  created_at: string
  updated_at: string
}

export default function TablesAdminPage() {
  const language = useAdminLanguage()
  const [tables, setTables] = useState<Table[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingTable, setEditingTable] = useState<Table | null>(null)
  const [newTableNumber, setNewTableNumber] = useState("")
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  // local UI states for guards
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Get localized text
  const L = getAdminTablesTexts(language)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Error message extractor (placed early)

  // QR generator (placed before fetchTables to avoid TDZ)
  const generateQRCode = async (tableId: string, url: string) => {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      })
      setQrCodes(prev => ({ ...prev, [tableId]: qrCodeDataUrl }))
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch('/api/tables', { cache: 'no-store' })
      const json = await res.json()
      if (!json.success) {
        throw new Error(json.error || 'Failed')
      }
      const list: Table[] = json.data || []
      setTables(list)
      list.forEach(tbl => generateQRCode(String(tbl.id), tbl.qr_code))
    } catch (error: unknown) {
      console.error('Error fetching tables:', error)
      const msg = getErrMsg(error)
      console.log('Admin: Error fetching tables', msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    fetchTables()
  }, [mounted, fetchTables])

  if (!mounted) {
    return null
  }


  const handleAddTable = async () => {
    if (!newTableNumber.trim() || adding) return
    const num = Number(newTableNumber)
    if (!Number.isInteger(num) || num < 1) {
      console.log('Admin: Invalid table number entered')
      setErrorMessage(L.invalidNumber)
      return
    }
    try {
      setAdding(true)
      setErrorMessage(null); setSuccessMessage(null)
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_number: num })
      })
      const json = await res.json()
      if (!json.success) {
        console.log('Admin: Error adding table', json.error)
        if (json.error === 'TABLE_NUMBER_EXISTS') {
          setErrorMessage(language==='ar' ? 'رقم الطاولة مستخدم بالفعل' : 'Numéro de table déjà utilisé')
        } else {
          setErrorMessage(L.operationFailed)
        }
        return
      }
      setNewTableNumber('')
      setIsAddDialogOpen(false)
      await fetchTables()
      console.log('Admin: Table added successfully')
      setSuccessMessage(language==='ar' ? 'تم إضافة الطاولة بنجاح' : 'Table ajoutée avec succès')
    } catch (error: unknown) {
      console.error('Error adding table:', error)
      console.log('Admin: Error adding table', getErrMsg(error))
      setErrorMessage(L.operationFailed)
    } finally {
      setAdding(false)
    }
  }

    const handleEditTable = async () => {
    if (!editingTable || !newTableNumber.trim() || editing) return
    const num = Number(newTableNumber)
    if (!Number.isInteger(num) || num < 1) {
      console.log('Admin: Invalid table number for edit')
      setErrorMessage(L.invalidNumber)
      return
    }
    try {
      setEditing(true)
      setErrorMessage(null); setSuccessMessage(null)
      const res = await fetch(`/api/tables/${editingTable.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_number: num })
      })
      const json = await res.json()
      if (!json.success) {
        console.log('Admin: Error editing table', json.error)
        if (json.error === 'TABLE_NUMBER_EXISTS') {
          setErrorMessage(language==='ar' ? 'رقم الطاولة مستخدم بالفعل' : 'Numéro de table déjà utilisé')
        } else {
          setErrorMessage(L.operationFailed)
        }
        return
      }
      setEditingTable(null)
      setNewTableNumber('')
      setIsEditDialogOpen(false)
      await fetchTables()
      console.log('Admin: Table updated successfully')
      setSuccessMessage(language==='ar' ? 'تم تحديث الطاولة بنجاح' : 'Table mise à jour avec succès')
    } catch (error: unknown) {
      console.error('Error updating table:', error)
      console.log('Admin: Error updating table', getErrMsg(error))
      setErrorMessage(L.operationFailed)
    } finally {
      setEditing(false)
    }
  }

  const handleDeleteTable = async (tableId: number) => {
    if (deletingId) return
    try {
      setDeletingId(tableId)
      setErrorMessage(null); setSuccessMessage(null)
      const res = await fetch(`/api/tables/${tableId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) {
        console.log('Admin: Error deleting table', json.error)
        setErrorMessage(L.operationFailed)
        return
      }
      await fetchTables()
      console.log('Admin: Table deleted successfully')
      setSuccessMessage(language==='ar' ? 'تم حذف الطاولة بنجاح' : 'Table supprimée avec succès')
    } catch (error: unknown) {
      console.error('Error deleting table:', error)
      console.log('Admin: Error deleting table', getErrMsg(error))
      setErrorMessage(L.operationFailed)
    } finally {
      setDeletingId(null)
    }
  }

  function getErrMsg(e: unknown): string {
    if (typeof e === 'string') return e
    if (e && typeof e === 'object' && 'message' in e) {
      const m = (e as { message?: unknown }).message
      if (typeof m === 'string') return m
    }
    return 'Error'
  }

  const downloadQRCode = (table: Table) => {
    const qrCodeDataUrl = qrCodes[String(table.id)]
    if (!qrCodeDataUrl) return

    const link = document.createElement("a")
    link.download = `table-${table.table_number}-qr.png`
    link.href = qrCodeDataUrl
    link.click()
  }

  const openEditDialog = (table: Table) => {
    if (adding || editing) return
    setEditingTable(table)
    setNewTableNumber(String(table.table_number))
    setIsEditDialogOpen(true)
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
          <AdminHeader title={L.title} />
          <main className="container mx-auto px-4 py-6">
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-slate-500 text-lg">{L.loading}</p>
            </div>
          </main>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
        <AdminHeader title={L.title} />
        
        <div className="p-4 pb-20 space-y-6">
          {(errorMessage || successMessage) && (
            <div className="space-y-2">
              {errorMessage && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {successMessage}
                </div>
              )}
            </div>
          )}
          {/* Header Section with Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/50 p-6">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <div>
                <h1 className="text-xl font-semibold text-slate-900 mb-1">{L.manageTables}</h1>
                <p className="text-sm text-slate-500">{L.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => {
                    setRefreshing(true)
                    fetchTables().finally(() => setRefreshing(false))
                  }}
                  disabled={refreshing}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 border-slate-200 hover:bg-slate-50"
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {language === 'ar' ? 'تحديث' : 'Actualiser'}
                </Button>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-md flex items-center gap-2"
                      disabled={adding || editing}
                    >
                      <Plus className="w-4 h-4" />
                      {L.addTable}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>{L.addTable}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label htmlFor="tableName">{L.tableName}</Label>
                        <Input
                          id="tableName"
                          type="number"
                          value={newTableNumber}
                          onChange={(e) => setNewTableNumber(e.target.value)}
                          placeholder={L.tableNumber}
                          className="mt-2 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex gap-2 justify-end pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setIsAddDialogOpen(false)}
                          disabled={adding}
                          className="border-slate-200 hover:bg-slate-50"
                        >
                          {L.cancel}
                        </Button>
                        <Button
                          onClick={handleAddTable}
                          disabled={adding}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-md"
                        >
                          {adding ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              {language === 'ar' ? 'جاري الإضافة...' : 'Ajout...'}
                            </>
                          ) : (
                            L.save
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          {/* Tables Grid */}
          {tables.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/50 p-12">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full mx-auto flex items-center justify-center mb-4">
                  <QrCode className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{L.noTables}</h3>
                <p className="text-slate-500 mb-4">{L.addFirstTable}</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {tables.map((table, index) => (
                <Card
                  key={table.id}
                  className="group hover:shadow-lg border-slate-200/60 transition-all duration-200 bg-white/80 backdrop-blur-sm hover:bg-white hover:scale-[1.02] animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2 text-slate-900">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        {L.tableNumber} {table.table_number}
                      </CardTitle>
                      <div className="p-2 bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg">
                        <QrCode className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* QR Code Display */}
                    <div className="flex justify-center">
                      {qrCodes[String(table.id)] ? (
                        <div className="relative group">
                          <Image
                            src={qrCodes[String(table.id)] || "/placeholder.svg"}
                            alt={`${L.qrCodeFor} ${table.table_number}`}
                            className="w-32 h-32 border-2 border-slate-200 rounded-xl shadow-sm bg-white p-2 group-hover:shadow-md transition-shadow"
                            width={128}
                            height={128}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 rounded-xl transition-all" />
                        </div>
                      ) : (
                        <div className="w-32 h-32 bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-slate-200 rounded-xl flex items-center justify-center">
                          <div className="text-center">
                            <Loader2 className="w-6 h-6 text-slate-400 animate-spin mx-auto mb-2" />
                            <p className="text-xs text-slate-500">{L.generatingQR}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(table)}
                        disabled={adding || editing}
                        className="border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                      >
                        <Edit className="w-3 h-3" />
                        {L.edit}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(table.qr_code, '_blank')}
                        className="border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {L.viewMenu}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadQRCode(table)}
                        disabled={!qrCodes[String(table.id)]}
                        className="border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                      >
                        <Download className="w-3 h-3" />
                        {L.download}
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={deletingId === table.id}
                            className="border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 flex items-center gap-2"
                          >
                            {deletingId === table.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            {deletingId === table.id ? (
                              language === 'ar' ? 'جاري الحذف...' : 'Suppression...'
                            ) : (
                              L.delete
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{L.deleteConfirm}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {L.deleteDescription}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-slate-200 hover:bg-slate-50">
                              {L.cancel}
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteTable(table.id)}
                              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 shadow-md"
                            >
                              {L.delete}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{L.editTable}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="editTableName">{L.tableName}</Label>
                  <Input
                    id="editTableName"
                    type="number"
                    value={newTableNumber}
                    onChange={(e) => setNewTableNumber(e.target.value)}
                    placeholder={L.tableNumber}
                    className="mt-2 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                    disabled={editing}
                    className="border-slate-200 hover:bg-slate-50"
                  >
                    {L.cancel}
                  </Button>
                  <Button
                    onClick={handleEditTable}
                    disabled={editing}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-md"
                  >
                    {editing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {language === 'ar' ? 'جاري التحديث...' : 'Mise à jour...'}
                      </>
                    ) : (
                      L.save
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </AdminLayout>
  )
}
