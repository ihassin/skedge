class SectionDecorator < Draper::Decorator
	delegate_all

	DaysOfWeek = {"M" => "Mon", "T" => "Tues", "W" => "Wed", "R" => "Thurs", "F" => "Fri", "S" => "Sat", "U" => "Sun"}

	def format_time(time, ampm=true)
		hour = object.hour(time)
		mins = object.minutes(time)
		am = hour < 12
		if hour > 12
			hour = "#{hour - 12}"
		end
		"#{hour}:#{mins.to_s.rjust(2,"0")}#{ampm ? (am ? "am" : "pm") : ""}"
	end

	def time(ampm=true)
		s = format_time(:start,ampm)
		e = format_time(:end,ampm)
		"#{s}-#{e}"
	end

	def time_and_day
		# days is like "MWF". split into chars, map each one to the longer version, join with /, so Mon/Wed/Fri
		d = object.days.split("").map {|d| DaysOfWeek[d]}.join("/")
		"#{d} #{time}"
	end

	def popover_content
		cont = h.truncate(course.description, length:400)
		"<p><strong>Instructors:</strong> #{instructor_list.join(", ")}</p><p class=\"popover-desc\">#{cont}</p>"
	end

	def popover_title
		title = h.truncate(course.title, length:27)
		"<span class='p-title'>#{title}</span> <span class=\"popover-credits\">#{course.credits} credits</span>"
	end

	def time_and_place
		if object.time_tba?
			"TBA"
		else
			time_and_day + (!object.building.empty? ? ", #{object.building} #{object.room}" : "")
		end
	end

	def status
		case object.status
		when Section::Status::Open
			"Open"
		when Section::Status::Closed
			"Closed"
		when Section::Status::Cancelled
			"Cancelled"
		end
	end

	def term_and_year
		"#{object.term} #{object.year}"
	end

	def button_text(name)
		if object.time_tba?
      		"Time & Place TBA"
		elsif !object.cancelled?
        	"Loading..."
        else
        	status
        end
	end

	def enroll_bar_style
		return "info" if object.no_cap?
		return "success" if object.enroll_percent < 75
		return "warning" if object.enroll_percent < 90
		return "danger" if object.enroll_percent < 100
		return "closed"
	end

	def enroll_bar_precentage
		return 100 if object.no_cap?
		object.enroll_percent
	end

	def enroll_ratio
		"#{object.enroll}/#{object.no_cap? ? "∞" : object.cap}"
	end

	def add_button_class
		c = if object.section_type == Section::Type::Course
			!object.cancelled? ? (object.closed? ? "closed" : (object.time_tba? ? "btn-default" : "")) : "disabled"
		else
			!object.cancelled? ? "btn-primary" : "disabled full"
		end
		c += " locked" if object.course.requires_code?
		c
	end

	def add_button_tooltip
		# "Replace CSC 172?"
		object.course.requires_code? ? "Instructor's permission is required." : ""
	end

	def format_name(name)
		name.downcase.gsub(/mc (.*)/, 'mc\1').gsub(/(^|\s+|'|-)(mc)?[A-Za-z]/) do |w|
			w.upcase!
			if w.start_with? "MC"
				w[1] = "c"
			end
			w
		end
	end

	def instructor_list
		return [] if !object.instructors
		object.instructors.map do |i|
			format_name(i)
		end
	end

	def data
		d = object.data.map do |k,v|
			if !v
				v = "null"
			elsif !v.is_a?(Numeric)
				v = "\"#{v.gsub("\"","\\\"")}\""
			end
			"\"#{k}\":#{v}"
		end.join(",")
		"{#{d}}"
	end
end