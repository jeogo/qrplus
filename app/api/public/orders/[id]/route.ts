import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase/admin'

// GET /api/public/orders/:id - get order details for public client
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orderId = Number(params.id)
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ success: false, error: 'INVALID_ORDER_ID' }, { status: 400 })
    }

    const db = admin.firestore()
    
    // Get order
    const orderRef = db.collection('orders').doc(String(orderId))
    const orderSnap = await orderRef.get()
    
    if (!orderSnap.exists) {
      return NextResponse.json({ success: false, error: 'ORDER_NOT_FOUND' }, { status: 404 })
    }

    const orderData = orderSnap.data()!
    
    // Get order items
    const itemsSnap = await db.collection('order_items')
      .where('order_id', '==', orderId)
      .get()
    
    const items = itemsSnap.docs.map(doc => doc.data())

    return NextResponse.json({
      success: true,
      data: {
        order: orderData,
        items: items
      }
    })
  } catch (error) {
    console.error('[API][PUBLIC_ORDER_GET]', error)
    return NextResponse.json(
      { success: false, error: 'Server error' }, 
      { status: 500 }
    )
  }
}
