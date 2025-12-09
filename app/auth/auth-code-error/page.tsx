import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function AuthCodeError() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center text-destructive">Authentication Error</CardTitle>
                    <CardDescription className="text-center">
                        There was a problem signing you in.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="text-muted-foreground">
                        The authentication code provided is invalid or has expired. Please try signing in again.
                    </p>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Button asChild>
                        <Link href="/sign-in">
                            Return to Sign In
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
