export default function handler(req, res) {
    if (req.method === 'GET') {
        console.log(`[${new Date().toISOString()}] Received a ping from UptimeRobot!`);
        res.status(200).send('Bot is running smoothly!');
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).json({ message: `Method ${req.method} not allowed` });
    }
}