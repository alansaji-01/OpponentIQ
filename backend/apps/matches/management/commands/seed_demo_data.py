import random
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.teams.models import Team, Player
from apps.matches.models import Match, MatchTeam, MatchEvent

class Command(BaseCommand):
    help = 'Seeds realistic demo football intelligence dataset (idempotent, tagged with is_demo_data=True)'

    def handle(self, *args, **options):
        self.stdout.write("Starting idempotent demo data seeding...")

        # 1. Clubs Definitions (2 Main Clubs, 2 Sparring Clubs)
        clubs_data = [
            {
                "name": "Manchester City",
                "short_code": "MCI",
                "primary_color": "#6CABDD",
                "default_formation": "4-3-3",
                "pressing_style": Team.PressingStyle.HIGH,
                "is_demo_data": True,
                "players": [
                    ("Ederson", 31, "GK", "LEFT"),
                    ("Kyle Walker", 2, "RB", "RIGHT"),
                    ("Ruben Dias", 3, "CB", "RIGHT"),
                    ("John Stones", 5, "CB", "RIGHT"),
                    ("Josko Gvardiol", 24, "LB", "LEFT"),
                    ("Rodri", 16, "CDM", "RIGHT"),
                    ("Kevin De Bruyne", 17, "CAM", "RIGHT"),
                    ("Bernardo Silva", 20, "CM", "LEFT"),
                    ("Phil Foden", 47, "RW", "LEFT"),
                    ("Jeremy Doku", 11, "LW", "RIGHT"),
                    ("Erling Haaland", 9, "ST", "LEFT"),
                    ("Manuel Akanji", 25, "CB", "RIGHT"),
                    ("Mateo Kovacic", 8, "CM", "RIGHT"),
                    ("Jack Grealish", 10, "LW", "RIGHT"),
                ]
            },
            {
                "name": "Arsenal FC",
                "short_code": "ARS",
                "primary_color": "#EF0107",
                "default_formation": "4-3-3",
                "pressing_style": Team.PressingStyle.HIGH,
                "is_demo_data": True,
                "players": [
                    ("David Raya", 22, "GK", "RIGHT"),
                    ("Ben White", 4, "RB", "RIGHT"),
                    ("William Saliba", 2, "CB", "RIGHT"),
                    ("Gabriel Magalhaes", 6, "CB", "LEFT"),
                    ("Jurrien Timber", 12, "LB", "RIGHT"),
                    ("Thomas Partey", 5, "CDM", "RIGHT"),
                    ("Declan Rice", 41, "CM", "RIGHT"),
                    ("Martin Odegaard", 8, "CAM", "LEFT"),
                    ("Bukayo Saka", 7, "RW", "LEFT"),
                    ("Gabriel Martinelli", 11, "LW", "RIGHT"),
                    ("Kai Havertz", 29, "CF", "LEFT"),
                    ("Leandro Trossard", 19, "LW", "RIGHT"),
                    ("Mikel Merino", 23, "CM", "LEFT"),
                    ("Riccardo Calafiori", 33, "LB", "LEFT"),
                ]
            },
            {
                "name": "Liverpool FC",
                "short_code": "LIV",
                "primary_color": "#C8102E",
                "default_formation": "4-2-3-1",
                "pressing_style": Team.PressingStyle.HIGH,
                "is_demo_data": True,
                "players": [
                    ("Alisson Becker", 1, "GK", "RIGHT"),
                    ("Trent Alexander-Arnold", 66, "RB", "RIGHT"),
                    ("Ibrahima Konate", 5, "CB", "RIGHT"),
                    ("Virgil van Dijk", 4, "CB", "RIGHT"),
                    ("Andy Robertson", 26, "LB", "LEFT"),
                    ("Ryan Gravenberch", 38, "CDM", "RIGHT"),
                    ("Alexis Mac Allister", 10, "CM", "RIGHT"),
                    ("Dominik Szoboszlai", 8, "CAM", "RIGHT"),
                    ("Mohamed Salah", 11, "RW", "LEFT"),
                    ("Luis Diaz", 7, "LW", "RIGHT"),
                    ("Darwin Nunez", 9, "ST", "RIGHT"),
                    ("Cody Gakpo", 18, "LW", "RIGHT"),
                    ("Curtis Jones", 17, "CM", "RIGHT"),
                    ("Joe Gomez", 2, "CB", "RIGHT"),
                ]
            },
            {
                "name": "Real Madrid CF",
                "short_code": "RMA",
                "primary_color": "#FEBE10",
                "default_formation": "4-3-3",
                "pressing_style": Team.PressingStyle.MID,
                "is_demo_data": True,
                "players": [
                    ("Thibaut Courtois", 1, "GK", "LEFT"),
                    ("Dani Carvajal", 2, "RB", "RIGHT"),
                    ("Eder Militao", 3, "CB", "RIGHT"),
                    ("Antonio Rudiger", 22, "CB", "RIGHT"),
                    ("Ferland Mendy", 23, "LB", "LEFT"),
                    ("Aurelien Tchouameni", 14, "CDM", "RIGHT"),
                    ("Federico Valverde", 8, "CM", "RIGHT"),
                    ("Jude Bellingham", 5, "CAM", "RIGHT"),
                    ("Rodrygo Goes", 11, "RW", "RIGHT"),
                    ("Vinicius Junior", 7, "LW", "RIGHT"),
                    ("Kylian Mbappe", 9, "ST", "RIGHT"),
                    ("Luka Modric", 10, "CM", "RIGHT"),
                    ("Eduardo Camavinga", 6, "CM", "LEFT"),
                    ("Brahim Diaz", 21, "CAM", "BOTH"),
                ]
            }
        ]

        teams_map = {}
        players_map = {}

        with transaction.atomic():
            for c_info in clubs_data:
                team, _ = Team.objects.update_or_create(
                    short_code=c_info["short_code"],
                    defaults={
                        "name": c_info["name"],
                        "primary_color": c_info["primary_color"],
                        "default_formation": c_info["default_formation"],
                        "pressing_style": c_info["pressing_style"],
                        "is_demo_data": True,
                    }
                )
                teams_map[c_info["short_code"]] = team

                team_players = []
                for p_name, p_num, p_pos, p_foot in c_info["players"]:
                    player, _ = Player.objects.update_or_create(
                        team=team,
                        jersey_number=p_num,
                        defaults={
                            "full_name": p_name,
                            "primary_position": p_pos,
                            "preferred_foot": p_foot,
                            "is_active": True,
                        }
                    )
                    team_players.append(player)
                players_map[c_info["short_code"]] = team_players

            self.stdout.write(f"Created/updated 4 teams and {sum(len(p) for p in players_map.values())} players.")

            # 2. Matches Setup (6+ matches across combinations)
            match_fixtures = [
                ("MCI", "ARS", 2, 2, "Premier League", datetime(2026, 9, 22, 16, 30, tzinfo=timezone.utc)),
                ("ARS", "LIV", 2, 1, "Premier League", datetime(2026, 10, 27, 17, 30, tzinfo=timezone.utc)),
                ("RMA", "MCI", 3, 3, "UEFA Champions League", datetime(2026, 4, 9, 20, 0, tzinfo=timezone.utc)),
                ("LIV", "MCI", 1, 1, "Premier League", datetime(2026, 3, 10, 15, 45, tzinfo=timezone.utc)),
                ("ARS", "RMA", 1, 0, "UEFA Champions League", datetime(2026, 11, 5, 20, 0, tzinfo=timezone.utc)),
                ("LIV", "RMA", 2, 0, "UEFA Champions League", datetime(2026, 11, 27, 20, 0, tzinfo=timezone.utc)),
                ("MCI", "LIV", 3, 2, "Premier League", datetime(2026, 12, 1, 16, 0, tzinfo=timezone.utc)),
            ]

            total_events_generated = 0
            random.seed(42)  # Deterministic seed for consistency

            for h_code, a_code, h_goals, a_goals, comp, m_date in match_fixtures:
                home_t = teams_map[h_code]
                away_t = teams_map[a_code]

                match, created = Match.objects.update_or_create(
                    home_team=home_t,
                    away_team=away_t,
                    match_date=m_date,
                    defaults={
                        "competition": comp,
                        "home_score": h_goals,
                        "away_score": a_goals,
                        "status": Match.Status.COMPLETED,
                        "venue": f"{home_t.name} Stadium",
                        "is_demo_data": True,
                    }
                )

                # Reset events if existing match to maintain idempotency
                match.events.all().delete()
                match.match_teams.all().delete()

                # Generate MatchTeam Aggregate Records
                h_shots = random.randint(12, 22)
                a_shots = random.randint(8, 16)
                h_poss = round(random.uniform(48.0, 64.0), 2)
                a_poss = round(100.0 - h_poss, 2)

                MatchTeam.objects.create(
                    match=match,
                    team=home_t,
                    is_home=True,
                    formation_used=home_t.default_formation,
                    possession_pct=Decimal(str(h_poss)),
                    ppda=Decimal(str(round(random.uniform(7.5, 11.2), 2))),
                    shots=h_shots,
                    shots_on_target=random.randint(h_goals, min(h_shots, h_goals + 6)),
                    passes_completed=random.randint(420, 610),
                    passes_attempted=random.randint(490, 680),
                    tackles=random.randint(14, 25),
                    interceptions=random.randint(8, 17),
                    fouls=random.randint(6, 14),
                    corners=random.randint(4, 9),
                    offsides=random.randint(1, 4),
                )

                MatchTeam.objects.create(
                    match=match,
                    team=away_t,
                    is_home=False,
                    formation_used=away_t.default_formation,
                    possession_pct=Decimal(str(a_poss)),
                    ppda=Decimal(str(round(random.uniform(8.5, 13.5), 2))),
                    shots=a_shots,
                    shots_on_target=random.randint(a_goals, min(a_shots, a_goals + 5)),
                    passes_completed=random.randint(310, 490),
                    passes_attempted=random.randint(380, 560),
                    tackles=random.randint(15, 27),
                    interceptions=random.randint(9, 19),
                    fouls=random.randint(8, 16),
                    corners=random.randint(2, 6),
                    offsides=random.randint(1, 3),
                )

                # Generate 350+ realistic chronological events per match (Total > 2,450)
                events_to_create = []
                h_players = players_map[h_code]
                a_players = players_map[a_code]

                # Distribute events across 90 minutes
                events_count = random.randint(360, 420)
                
                # Goal minutes allocation
                goal_events = []
                for _ in range(h_goals):
                    goal_events.append((home_t, random.choice([p for p in h_players if p.primary_position in ['ST', 'LW', 'RW', 'CAM']]), random.randint(3, 90)))
                for _ in range(a_goals):
                    goal_events.append((away_t, random.choice([p for p in a_players if p.primary_position in ['ST', 'LW', 'RW', 'CAM']]), random.randint(3, 90)))

                for i in range(events_count):
                    minute = int((i / events_count) * 90) + 1
                    second = random.randint(0, 59)
                    period = 1 if minute <= 45 else 2

                    # Pick attacking team based on possession weight
                    is_home_event = random.random() < (h_poss / 100.0)
                    active_team = home_t if is_home_event else away_t
                    active_players = h_players if is_home_event else a_players
                    opp_players = a_players if is_home_event else h_players

                    # Event distribution: 68% Pass, 10% Tackle/Interception, 8% Turnover, 8% Shot, 4% Corner/Foul, 2% Dribble
                    r_type = random.random()
                    
                    # Check if a goal happens in this minute
                    goal_match = [g for g in goal_events if g[2] == minute]
                    if goal_match and r_type < 0.15:
                        g_team, g_player, _ = goal_match.pop(0)
                        # Shot that leads to Goal
                        s_x = Decimal(str(round(random.uniform(84.0, 96.0), 2))) if g_team == home_t else Decimal(str(round(random.uniform(4.0, 16.0), 2)))
                        s_y = Decimal(str(round(random.uniform(35.0, 65.0), 2)))
                        events_to_create.append(MatchEvent(
                            match=match,
                            team=g_team,
                            player=g_player,
                            period=period,
                            minute=minute,
                            second=second,
                            event_type=MatchEvent.EventType.SHOT,
                            outcome=MatchEvent.Outcome.GOAL,
                            start_x=s_x,
                            start_y=s_y,
                            end_x=Decimal("100.0") if g_team == home_t else Decimal("0.0"),
                            end_y=Decimal("50.0"),
                            under_pressure=random.choice([True, False]),
                            xg_value=Decimal(str(round(random.uniform(0.35, 0.85), 4)))
                        ))
                        continue

                    if r_type < 0.68:
                        # PASS
                        passer = random.choice(active_players)
                        recip = random.choice([p for p in active_players if p != passer])
                        
                        start_x = round(random.uniform(15.0, 85.0), 2)
                        start_y = round(random.uniform(10.0, 90.0), 2)
                        # progressive drift towards target side
                        direction = 1 if is_home_event else -1
                        end_x = max(0.0, min(100.0, round(start_x + direction * random.uniform(-5.0, 25.0), 2)))
                        end_y = max(0.0, min(100.0, round(start_y + random.uniform(-20.0, 20.0), 2)))

                        outcome = MatchEvent.Outcome.SUCCESS if random.random() < 0.84 else MatchEvent.Outcome.FAIL

                        events_to_create.append(MatchEvent(
                            match=match,
                            team=active_team,
                            player=passer,
                            recipient_player=recip if outcome == MatchEvent.Outcome.SUCCESS else None,
                            period=period,
                            minute=minute,
                            second=second,
                            event_type=MatchEvent.EventType.PASS,
                            outcome=outcome,
                            start_x=Decimal(str(start_x)),
                            start_y=Decimal(str(start_y)),
                            end_x=Decimal(str(end_x)),
                            end_y=Decimal(str(end_y)),
                            under_pressure=random.random() < 0.32,
                            xg_value=None
                        ))

                    elif r_type < 0.76:
                        # SHOT (Non-goal)
                        shooter = random.choice([p for p in active_players if p.primary_position in ['ST', 'LW', 'RW', 'CAM', 'CM']])
                        s_x = Decimal(str(round(random.uniform(72.0, 95.0), 2))) if is_home_event else Decimal(str(round(random.uniform(5.0, 28.0), 2)))
                        s_y = Decimal(str(round(random.uniform(25.0, 75.0), 2)))
                        shot_outcome = random.choice([
                            MatchEvent.Outcome.SAVED,
                            MatchEvent.Outcome.OFF_TARGET,
                            MatchEvent.Outcome.BLOCKED
                        ])
                        events_to_create.append(MatchEvent(
                            match=match,
                            team=active_team,
                            player=shooter,
                            period=period,
                            minute=minute,
                            second=second,
                            event_type=MatchEvent.EventType.SHOT,
                            outcome=shot_outcome,
                            start_x=s_x,
                            start_y=s_y,
                            end_x=Decimal("100.0") if is_home_event else Decimal("0.0"),
                            end_y=Decimal(str(round(random.uniform(42.0, 58.0), 2))),
                            under_pressure=random.choice([True, False]),
                            xg_value=Decimal(str(round(random.uniform(0.03, 0.42), 4)))
                        ))

                    elif r_type < 0.86:
                        # TACKLE or INTERCEPTION
                        def_player = random.choice(opp_players)
                        t_x = Decimal(str(round(random.uniform(20.0, 80.0), 2)))
                        t_y = Decimal(str(round(random.uniform(10.0, 90.0), 2)))
                        ev_t = MatchEvent.EventType.TACKLE if random.random() < 0.6 else MatchEvent.EventType.INTERCEPTION
                        events_to_create.append(MatchEvent(
                            match=match,
                            team=away_t if is_home_event else home_t,
                            player=def_player,
                            period=period,
                            minute=minute,
                            second=second,
                            event_type=ev_t,
                            outcome=MatchEvent.Outcome.SUCCESS if random.random() < 0.75 else MatchEvent.Outcome.FAIL,
                            start_x=t_x,
                            start_y=t_y,
                            end_x=t_x,
                            end_y=t_y,
                            under_pressure=True,
                            xg_value=None
                        ))

                    elif r_type < 0.94:
                        # TURNOVER / POSSESSION CHANGE
                        t_player = random.choice(active_players)
                        x = Decimal(str(round(random.uniform(30.0, 70.0), 2)))
                        y = Decimal(str(round(random.uniform(15.0, 85.0), 2)))
                        events_to_create.append(MatchEvent(
                            match=match,
                            team=active_team,
                            player=t_player,
                            period=period,
                            minute=minute,
                            second=second,
                            event_type=MatchEvent.EventType.TURNOVER,
                            outcome=MatchEvent.Outcome.FAIL,
                            start_x=x,
                            start_y=y,
                            end_x=x,
                            end_y=y,
                            under_pressure=True,
                            xg_value=None
                        ))

                    else:
                        # FOUL or CORNER
                        ev_c = MatchEvent.EventType.CORNER if random.random() < 0.5 else MatchEvent.EventType.FOUL
                        c_x = Decimal(str(round(random.uniform(85.0, 100.0), 2))) if is_home_event else Decimal(str(round(random.uniform(0.0, 15.0), 2)))
                        c_y = Decimal(str(round(random.uniform(0.0, 20.0), 2))) if random.random() < 0.5 else Decimal(str(round(random.uniform(80.0, 100.0), 2)))
                        events_to_create.append(MatchEvent(
                            match=match,
                            team=active_team,
                            player=random.choice(active_players),
                            period=period,
                            minute=minute,
                            second=second,
                            event_type=ev_c,
                            outcome=MatchEvent.Outcome.SUCCESS,
                            start_x=c_x,
                            start_y=c_y,
                            end_x=c_x,
                            end_y=c_y,
                            under_pressure=False,
                            xg_value=None
                        ))

                MatchEvent.objects.bulk_create(events_to_create)
                total_events_generated += len(events_to_create)
                self.stdout.write(f"  -> Generated match {home_t.short_code} vs {away_t.short_code} ({len(events_to_create)} events)")

            self.stdout.write(self.style.SUCCESS(
                f"\nSuccessfully seeded demo data: 4 Clubs, 56 Players, 7 Matches, {total_events_generated} Events (all tagged is_demo_data=True)"
            ))
