"""Run the server on one dual-stack socket (IPv4 + IPv6).

Phones often resolve <mac>.local to IPv6 first; an IPv4-only server makes them
wait for a fallback. Uvicorn's --host takes a single family, hence this.
Usage: python -m app.serve [port] [certfile keyfile]
"""
import socket
import sys

import uvicorn


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    ssl = {"ssl_certfile": sys.argv[2], "ssl_keyfile": sys.argv[3]} if len(sys.argv) > 3 else {}
    sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
    sock.bind(("::", port))
    config = uvicorn.Config("app.main:app", **ssl)
    uvicorn.Server(config).run(sockets=[sock])


if __name__ == "__main__":
    main()
