import time

from django.core.management.base import BaseCommand
from django.db import close_old_connections

from users.sync_service import claim_next_job, enqueue_due_jobs, run_job


class Command(BaseCommand):
    help = "Run the durable automatic provider sync worker."

    def add_arguments(self, parser):
        parser.add_argument("--interval", type=int, default=60)
        parser.add_argument("--once", action="store_true")

    def handle(self, *args, **options):
        interval = max(5, options["interval"])
        while True:
            close_old_connections()
            enqueue_due_jobs()
            job = claim_next_job()
            if job:
                self.stdout.write(f"Syncing user={job.user_id} provider={job.provider}")
                run_job(job)
            elif options["once"]:
                return
            if options["once"]:
                return
            time.sleep(interval)
