
"use client"

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Trophy, ArrowLeft } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"


const topJokes = [
  { rank: 1, joke: "I told my computer I needed a break, and now it won’t stop sending me Kit-Kat ads.", creator: "PunMaster_42", likes: 1337 },
  { rank: 2, joke: "Why did the crypto bro get kicked out of the casino? He kept trying to HODL his chips.", creator: "SatoshiFan", likes: 1201 },
  { rank: 3, joke: "What do you call a lazy kangaroo? Pouch potato.", creator: "AussieJoker", likes: 987 },
  { rank: 4, joke: "My AI is so smart, it started an argument with me and then told me to 'check my sources.'", creator: "GPT_Guru", likes: 850 },
  { rank: 5, joke: "I have a joke about trickle-down economics. But 99% of you will never get it.", creator: "EcoNerd", likes: 765 },
];

export default function SubmitPage() {
    const [joke, setJoke] = useState("");
    const [creator, setCreator] = useState("");
    const { toast } = useToast();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!joke) {
            toast({
                title: "No Joke Detected",
                description: "Please write a joke before submitting.",
                variant: "destructive",
            });
            return;
        }

        // In a real app, this would submit to a backend.
        // For now, we'll just show a success message.
        toast({
            title: "Joke Submitted!",
            description: "Thanks for making the world funnier! Your joke is pending review.",
        });
        setJoke("");
        setCreator("");
    };
    
    return (
        <div className="flex flex-col items-center min-h-screen p-4 sm:p-8 pt-12">
            <main className="w-full max-w-4xl mx-auto flex flex-col items-center space-y-10">
                <header className="text-center w-full relative">
                    <Button asChild variant="ghost" className="absolute left-0 top-1/2 -translate-y-1/2">
                       <Link href="/"><ArrowLeft className="mr-2" /> Back to Jokes</Link>
                    </Button>
                    <h1 className="text-5xl md:text-6xl font-bold font-headline text-primary">Community Hub</h1>
                    <p className="text-lg text-muted-foreground">Submit jokes and climb the leaderboard!</p>
                </header>

                <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Submission Form */}
                    <div className="space-y-6">
                        <Card className="w-full bg-card/80 backdrop-blur-sm shadow-lg border">
                            <CardHeader>
                                <CardTitle className="text-2xl font-bold">Got a Banger?</CardTitle>
                                <CardDescription>Submit your original joke for a chance to be featured!</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <Label htmlFor="joke-text" className="text-lg font-semibold">Your Joke</Label>
                                        <Textarea 
                                            id="joke-text" 
                                            placeholder="Why did the scarecrow win an award? Because he was outstanding in his field!"
                                            value={joke}
                                            onChange={(e) => setJoke(e.target.value)}
                                            rows={4}
                                            className="mt-2"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="creator-name" className="text-lg font-semibold">Your Name (Optional)</Label>
                                        <Input 
                                            id="creator-name"
                                            placeholder="JokeSmith_2000"
                                            value={creator}
                                            onChange={(e) => setCreator(e.target.value)}
                                            className="mt-2"
                                        />
                                    </div>
                                    <Button type="submit" size="lg" className="w-full text-lg">Submit for Glory</Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Leaderboard */}
                    <div className="space-y-6">
                        <Card className="w-full bg-card/80 backdrop-blur-sm shadow-lg border">
                            <CardHeader>
                                <CardTitle className="text-2xl font-bold flex items-center"><Trophy className="mr-2 text-yellow-500" /> Weekly Leaderboard</CardTitle>
                                <CardDescription>The best jokes as voted by the community.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">Rank</TableHead>
                                            <TableHead>Joke</TableHead>
                                            <TableHead className="text-right">Likes</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {topJokes.map((item) => (
                                            <TableRow key={item.rank}>
                                                <TableCell className="font-bold text-lg text-center">{item.rank}</TableCell>
                                                <TableCell>
                                                    <p className="font-medium">{item.joke}</p>
                                                    <span className="text-xs text-muted-foreground">by {item.creator}</span>
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-primary">{item.likes}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}

    