import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'

// GET /api/public/orders/:id - get order details for public client
export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
  const { id } = await context.params
  const orderId = Number(id)

    // التحقق من صحة رقم الطلب
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ success: false, error: 'INVALID_ORDER_ID' }, { status: 400 })
    }

    const db = admin.firestore()
    
    // جلب بيانات الطلب
    const orderRef = db.collection('orders').doc(String(orderId))
    const orderSnap = await orderRef.get()
    
    if (!orderSnap.exists) {
      return NextResponse.json({ success: false, error: 'ORDER_NOT_FOUND' }, { status: 404 })
    }
    const orderData = orderSnap.data()!

    // جلب عناصر الطلب
    const itemsSnap = await db.collection('order_items')
      .where('order_id', '==', orderId)
      .get()
    
    const items = itemsSnap.docs.map(doc => {
      const data = doc.data()
      return {
        id: data.id,
        product_id: data.product_id,
        product_name: data.product_name || '',
        quantity: Number(data.quantity),
        price: Number(data.price),
        created_at: data.created_at,
        updated_at: data.updated_at
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        order: orderData,
        items
      }
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[API][PUBLIC_ORDER_GET]', error)
    }
    return NextResponse.json(
      { success: false, error: 'Server error' }, 
      { status: 500 }
    )
  }
}
