import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/utils/firebase';

export async function GET(request: NextRequest): Promise<Response> {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, error: 'No token provided' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        
        // Vérifier le token avec Firebase
        const decodedToken = await auth.verifyIdToken(token);
        
        return NextResponse.json({
            success: true,
            uid: decodedToken.uid,
            email: decodedToken.email,
            displayName: decodedToken.name || decodedToken.email,
            picture: decodedToken.picture
        });
    } catch (error) {
        console.error('[API] /api/auth/me error:', error);
        return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }
}
