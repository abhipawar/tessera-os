import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { login, signup } from "./actions"

export default function LoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
            <Card className="w-full max-w-md border-zinc-800 bg-zinc-900 text-zinc-100">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold tracking-tight">Access Tessera</CardTitle>
                    <CardDescription className="text-zinc-400">
                        Enter your email and password to authenticate.
                    </CardDescription>
                </CardHeader>
                <form>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="founder@company.com"
                                required
                                className="border-zinc-800 bg-zinc-950 text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="border-zinc-800 bg-zinc-950 text-white"
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-2">
                        <Button formAction={login} className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
                            Sign In
                        </Button>
                        <Button formAction={signup} variant="outline" className="w-full border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                            Create Account
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}